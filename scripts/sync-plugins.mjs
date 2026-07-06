import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PLUGIN_SOURCES } from "./plugin-sources.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pluginsRoot = path.join(root, "plugins");
const isCi = process.argv.includes("--ci") || process.env.SYNC_CI === "true";
const stashPluginsDir = path.resolve(root, "..");
const ciSourcesDir = path.join(root, "_sources");

const PLUGIN_ASSETS = [".yml", ".js", ".css", ".ico"];

function shouldCopyFile(entry, { prefix, include } = {}) {
  if (include?.includes(entry)) {
    return true;
  }
  if (!prefix || !entry.startsWith(prefix)) {
    return false;
  }
  return PLUGIN_ASSETS.includes(path.extname(entry));
}

function copyMatchingFiles(srcDir, destDir, { prefix, include, transformYml } = {}) {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    if (entry.startsWith(".")) continue;
    if (!shouldCopyFile(entry, { prefix, include })) continue;

    const ext = path.extname(entry);
    const src = path.join(srcDir, entry);
    if (!statSync(src).isFile()) continue;

    const dest = path.join(destDir, entry);
    if (ext === ".yml" && transformYml) {
      writeFileSync(dest, transformYml(readFileSync(src, "utf8")));
    } else {
      cpSync(src, dest);
    }
  }
}

function copyTree(srcDir, destDir) {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  rmSync(destDir, { recursive: true, force: true });
  cpSync(srcDir, destDir, { recursive: true });
}

function fixSelectRandomUrl(yml) {
  return yml.replace(
    /^url:\s*https:\/\/github\.com\/stashapp\/stash\s*$/m,
    "url: https://github.com/LetUsNot/stash-select-random"
  );
}

function transformYmlForPlugin(name, yml) {
  if (name === "stash_select_random") {
    return fixSelectRandomUrl(yml);
  }
  return yml;
}

function cloneSource(github, destDir) {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(path.dirname(destDir), { recursive: true });
  const url = `https://github.com/${github.owner}/${github.repo}.git`;
  console.log(`[sync] cloning ${github.owner}/${github.repo}@${github.branch}`);
  execSync(`git clone --depth 1 --branch ${github.branch} ${url} ${destDir}`, {
    stdio: "inherit"
  });
}

function resolveSourceDir(plugin) {
  if (isCi) {
    return path.join(ciSourcesDir, plugin.github.repo);
  }
  return path.join(stashPluginsDir, plugin.localDir);
}

function buildStashangle(stashangleRepo, { force = false } = {}) {
  const builtDist = path.join(stashangleRepo, "Stashangle", "dist", "ui.js");
  if (!force && existsSync(builtDist)) {
    return;
  }

  console.log("[sync] building Stashangle...");
  if (existsSync(path.join(stashangleRepo, "package-lock.json"))) {
    execSync("npm ci", { cwd: stashangleRepo, stdio: "inherit" });
  } else {
    execSync("npm install", { cwd: stashangleRepo, stdio: "inherit" });
  }
  execSync("npm run build", { cwd: stashangleRepo, stdio: "inherit" });

  if (!existsSync(builtDist)) {
    throw new Error(`Stashangle build did not produce ${builtDist}`);
  }
}

mkdirSync(pluginsRoot, { recursive: true });

if (isCi) {
  rmSync(ciSourcesDir, { recursive: true, force: true });
  mkdirSync(ciSourcesDir, { recursive: true });
}

for (const plugin of PLUGIN_SOURCES) {
  const sourceRepoDir = resolveSourceDir(plugin);

  if (isCi) {
    cloneSource(plugin.github, sourceRepoDir);
  }

  console.log(`[sync] ${plugin.name}`);

  if (plugin.type === "built") {
    buildStashangle(sourceRepoDir, { force: isCi });
    copyTree(
      path.join(sourceRepoDir, plugin.packageDir),
      path.join(pluginsRoot, plugin.dest)
    );
    continue;
  }

  copyMatchingFiles(sourceRepoDir, path.join(pluginsRoot, plugin.dest), {
    prefix: plugin.prefix,
    include: plugin.include,
    transformYml: (yml) => transformYmlForPlugin(plugin.name, yml)
  });
}

console.log("[sync] done");
