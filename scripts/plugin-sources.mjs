/** @typedef {{ owner: string, repo: string, branch: string }} GitHubSource */

/**
 * @typedef {object} AssetPluginSource
 * @property {string} name
 * @property {GitHubSource} github
 * @property {string} localDir
 * @property {string} dest
 * @property {"assets"} type
 * @property {string} prefix
 * @property {string[]=} include
 * @property {(yml: string) => string=} transformYml
 */

/**
 * @typedef {object} BuiltPluginSource
 * @property {string} name
 * @property {GitHubSource} github
 * @property {string} localDir
 * @property {string} dest
 * @property {"built"} type
 * @property {string} packageDir
 */

/** @type {(AssetPluginSource | BuiltPluginSource)[]} */
export const PLUGIN_SOURCES = [
  {
    name: "stashvisualtweaks",
    github: { owner: "LetUsNot", repo: "stashvisualtweaks", branch: "main" },
    localDir: "stashvisualtweaks",
    dest: "stashvisualtweaks",
    type: "assets",
    prefix: "stashvisualtweaks"
  },
  {
    name: "stashtitlecase",
    github: { owner: "LetUsNot", repo: "stashtitlecase", branch: "main" },
    localDir: "stashtitlecase",
    dest: "stashtitlecase",
    type: "assets",
    prefix: "stashtitlecase"
  },
  {
    name: "stash_select_random",
    github: { owner: "LetUsNot", repo: "stash-select-random", branch: "master" },
    localDir: "Stashselectrandom",
    dest: "stash_select_random",
    type: "assets",
    prefix: "stash_select_random"
  },
  {
    name: "emplink",
    github: { owner: "LetUsNot", repo: "emplink", branch: "master" },
    localDir: "emplink",
    dest: "emplink",
    type: "assets",
    prefix: "emplink",
    include: ["favicon.ico"]
  },
  {
    name: "Stashangle",
    github: { owner: "LetUsNot", repo: "stashangle", branch: "main" },
    localDir: "Stashangle",
    dest: "Stashangle",
    type: "built",
    packageDir: "Stashangle"
  }
];

export const LISTING_REPO = "LetUsNot/letusnot-stash-plugins";
