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
| **emplink** | Empornium search link icon next to the favorite heart on performer pages | [emplink](https://github.com/LetUsNot/emplink) |

## Maintainer workflow

Plugin code lives in each plugin’s own repository. To refresh this index after a plugin release:

1. Build or update the plugin in its dev repo (for **Stashangle**, run `npm run build` there first).
2. In this repo, sync packaged files into `plugins/`:

   ```bash
   npm run sync
   ```

3. Commit the updated `plugins/` tree and push to `main`.
4. GitHub Actions builds zips and publishes the index to GitHub Pages.

Local index build (requires Git Bash or WSL on Windows):

```bash
npm run build:site
```

Output lands in `_site/main/` (`index.yml` plus `*.zip` files).

## Repository layout

- `plugins/` — distributable plugin packages (synced from sibling dev repos)
- `scripts/sync-plugins.mjs` — copies built artifacts from `../stashvisualtweaks`, `../Stashangle`, etc.
- `build_site.sh` — generates `index.yml` and zip archives (used in CI)
- `.github/workflows/deploy.yml` — publishes to GitHub Pages on `plugins/**` changes

## Verify after deploy

1. Confirm the index loads: open `https://letusnot.github.io/letusnot-stash-plugins/main/index.yml` in a browser.
2. In Stash: **Settings → Plugins → Add Source** (URL above) → **Reload Plugins**.
3. All plugins should appear under **Available Plugins** for this source.

## License

Individual plugins retain their own licenses in their source repositories. This index repository follows the [stashapp/plugins-repo-template](https://github.com/stashapp/plugins-repo-template) build tooling (AGPL-3.0).
