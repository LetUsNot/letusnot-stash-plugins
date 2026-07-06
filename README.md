# LetUsNot Stash Plugins

A [Stash](https://github.com/stashapp/stash) plugin **source index** for UI plugins by [LetUsNot](https://github.com/LetUsNot). This repository publishes installable zip packages and an `index.yml` for Stash’s **Available Plugins** UI — it is not where plugin source code is developed.

## Install in Stash

1. Open **Settings → Plugins → Available Plugins**.
2. Click **Add Source**.
3. Enter this URL:

   `https://letusnot.github.io/letusnot-stash-plugins/main/index.yml`

4. Reload plugins and install from the new source.

## Plugins in this source

| Plugin | Description | Source repo |
|--------|-------------|-------------|
| **Stash Visual Tweaks** | Gold star ratings, right-aligned card icons, rounded cards, max row counts | [stashvisualtweaks](https://github.com/LetUsNot/stashvisualtweaks) |
| **Stashangle** | Rotate and scale video during scene marker playback | [stashangle](https://github.com/LetUsNot/stashangle) |
| **StashSelectRandom** | Jump to a random item from the current filtered list | [stash-select-random](https://github.com/LetUsNot/stash-select-random) |
| **Stash Title Case** | Hover-revealed title case button on the scene edit title field | [stashtitlecase](https://github.com/LetUsNot/stashtitlecase) |
| **emplink** | Empornium and Bunkr search links on performer pages | [emplink](https://github.com/LetUsNot/emplink) |

## Automatic index updates

Pushing to `main` or `master` on any plugin repo triggers a **Sync plugin packages** workflow here. That workflow:

1. Clones the latest plugin sources from GitHub
2. Builds **Stashangle**
3. Refreshes `plugins/`
4. Commits and pushes as **LetUsNot**
5. Runs the existing **Deploy** workflow to republish GitHub Pages

You can also run **Sync plugin packages** manually from the Actions tab (`workflow_dispatch`).

### One-time setup (LetUsNot account)

Cross-repo dispatch requires a Personal Access Token owned by **LetUsNot**:

1. Sign in as **LetUsNot** → **Settings → Developer settings → Fine-grained tokens → Generate new token**
2. Name it e.g. `letusnot-plugins-sync`
3. Repository access: **Only select repositories** — add `letusnot-stash-plugins` plus all five plugin repos
4. Permissions on those repos:
   - **Actions**: Read and write (to receive `repository_dispatch`)
   - **Contents**: Read (on plugin repos; Read and write on `letusnot-stash-plugins` if needed for future automation)
5. Copy the token and add it as secret **`LETUSNOT_PLUGINS_SYNC_TOKEN`** on **each plugin repo**:
   - [stashvisualtweaks](https://github.com/LetUsNot/stashvisualtweaks/settings/secrets/actions)
   - [stashangle](https://github.com/LetUsNot/stashangle/settings/secrets/actions)
   - [stash-select-random](https://github.com/LetUsNot/stash-select-random/settings/secrets/actions)
   - [stashtitlecase](https://github.com/LetUsNot/stashtitlecase/settings/secrets/actions)
   - [emplink](https://github.com/LetUsNot/emplink/settings/secrets/actions)

From a machine with the token (PowerShell):

```powershell
$token = Read-Host "Paste LetUsNot PAT"
$repos = @(
  "stashvisualtweaks", "stashangle", "stash-select-random", "stashtitlecase", "emplink"
)
foreach ($repo in $repos) {
  gh secret set LETUSNOT_PLUGINS_SYNC_TOKEN --repo "LetUsNot/$repo" --body $token
}
```

Ensure **Settings → Actions → General → Workflow permissions** allows the default `GITHUB_TOKEN` to **Read and write** on `letusnot-stash-plugins` so sync commits can push to `main`.

### Local maintainer workflow (optional)

```bash
npm run sync          # copy from sibling folders under Stash Plugins/
npm run sync:ci       # clone from GitHub (same as Actions)
npm run build:site    # local index build (Git Bash / WSL)
```

## License

Individual plugins retain their own licenses in their source repositories. This index repository follows the [stashapp/plugins-repo-template](https://github.com/stashapp/plugins-repo-template) build tooling (AGPL-3.0).
