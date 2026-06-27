import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const pluginsRoot = path.join(root, "plugins");
const stashPluginsDir = path.resolve(root, "..");

const PLUGIN_ASSETS = [".yml", ".js", ".css"];

function copyMatchingFiles(srcDir, destDir, { prefix, transformYml } = {}) {
  if (!existsSync(srcDir)) {
    throw new Error(`Source directory not found: ${srcDir}`);
  }

  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });

  for (const entry of readdirSync(srcDir)) {
    if (entry.startsWith(".")) continue;

    const ext = path.extname(entry);
    if (!PLUGIN_ASSETS.includes(ext)) continue;
    if (prefix && !entry.startsWith(prefix)) continue;

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

function ensureStashangleBuilt(stashangleRepo) {
  const builtDist = path.join(stashangleRepo, "Stashangle", "dist", "ui.js");
  if (existsSync(builtDist)) {
    return;
  }

  console.log("[sync] Stashangle dist missing; running npm run build...");
  execSync("npm run build", { cwd: stashangleRepo, stdio: "inherit" });

  if (!existsSync(builtDist)) {
    throw new Error(`Stashangle build did not produce ${builtDist}`);
  }
}

function fixSelectRandomUrl(yml) {
  return yml.replace(
    /^url:\s*https:\/\/github\.com\/stashapp\/stash\s*$/m,
    "url: https://github.com/LetUsNot/stash-select-random"
  );
}

const copies = [
  {
    name: "stashvisualtweaks",
    src: path.join(stashPluginsDir, "stashvisualtweaks"),
    dest: path.join(pluginsRoot, "stashvisualtweaks"),
    mode: "assets",
    prefix: "stashvisualtweaks"
  },
  {
    name: "stashtitlecase",
    src: path.join(stashPluginsDir, "stashtitlecase"),
    dest: path.join(pluginsRoot, "stashtitlecase"),
    mode: "assets",
    prefix: "stashtitlecase"
  },
  {
    name: "stash_select_random",
    src: path.join(stashPluginsDir, "Stashselectrandom"),
    dest: path.join(pluginsRoot, "stash_select_random"),
    mode: "assets",
    prefix: "stash_select_random",
    transformYml: fixSelectRandomUrl
  }
];

mkdirSync(pluginsRoot, { recursive: true });

for (const plugin of copies) {
  console.log(`[sync] ${plugin.name}`);
  copyMatchingFiles(plugin.src, plugin.dest, {
    prefix: plugin.prefix,
    transformYml: plugin.transformYml
  });
}

const stashangleRepo = path.join(stashPluginsDir, "Stashangle");
console.log("[sync] Stashangle");
ensureStashangleBuilt(stashangleRepo);
copyTree(path.join(stashangleRepo, "Stashangle"), path.join(pluginsRoot, "Stashangle"));

console.log("[sync] done");
