<div align="center"><img style = "width:100%;"src="https://i.imgur.com/lslR2VY.gif"></img></div>
<hr>
<h2 align=center>HeimerBuild</h2>
<h4 align=center>A League of Legends build calculator built with React.JS.</h4>
<br>
<div align=center style="display:flex; justify-content: center; gap:5%">
    <img style = "width:750px;"src="https://i.imgur.com/tkxIZ4f.png">
</div>
<br><hr>

## Portuguese demo video

https://github.com/lemoscaio/heimerbuild/assets/74937642/0db701dd-f5d7-47ce-bb57-3985efaf4bef

## Features

- All champions with updated stats
- Choose a champion and see all base stats of it, its roles, attack type and lore
- Change the champion level and see the stats update to the chosen level
- Chose up to 6 items and see the additional stats given by them
- Filter the items by champion role and by stats, and sort them by a stat
- Share a build as a link (`/champions/Heimerdinger?lvl=11&items=3089,3020&patch=16.19.1`)

## Motivation
I love how complex League of Legends is, and how every patch the meta can change by simply modifying the AD ratio for a certain character.

Because of this, I always wondered how I could calculate every aspect of a battle, starting from calculating all stats given by items, runes, and level, to how much damage I could do in a combo mixing all of the champion's skills depending on which champion I'm playing against. 

We all know that the current training mode is not good enough. It takes time to start a new training session since it's a real match after all. Not only that but there's no way of changing the runes quickly without creating a new match.

So my goal is to improve this project until I'll be able everything that happens in a battle that I already said and some others. This includes calculating how much time I'll take in a combo after all we know an AD Carrier does not always have the opportunity to just auto-attack the enemy to death depending on the matchup.

## Development

This project uses [Bun](https://bun.com) as package manager and script runner (version pinned in `package.json` under `packageManager`). Install it with `curl -fsSL https://bun.com/install | bash`.

```bash
bun install           # install dependencies (creates node_modules from bun.lock)
bun run dev           # start the Vite dev server
bun run build         # typecheck and build to dist/
bun run preview:local # serve the production build locally
bun run typecheck     # type-check the app and the tests, scripts and worker
bun run test          # run tests with bun test
bun run check         # lint and format check with Biome
bun run check:write   # apply Biome formatting and safe fixes
```

CI (`.github/workflows/ci.yml`) runs `biome ci`, the typecheck, the tests and the build on every pull request and push to `main`.

`bun install` also installs a [lefthook](https://lefthook.dev) pre-commit hook (`lefthook.yml`) that formats staged files with `biome check --write` and re-stages them; errors Biome cannot fix do not block the commit (CI catches them). Skip it once with `LEFTHOOK=0 git commit ...`.

### Worktrees

`scripts/wt` runs several git worktrees side by side, each with its own Vite port:

```bash
scripts/wt create <name> --branch <branch> [--deps] [--purpose <text>]  # ../heimerbuild-<name> from origin/main
scripts/wt start [name]              # bun run dev --port <port> --strictPort, in the background
scripts/wt stop [name]
scripts/wt status                    # name, branch, port, URL, state for every worktree
scripts/wt destroy <name> [--force]  # stop, remove, delete the branch once merged
```

- `[name]` defaults to the worktree you run it from; the main checkout is `main`.
- Ports are stable per worktree and stored in `~/.heimerbuild-wt.json`: `main` always uses 5173, the others get the lowest free port from 5174. `start` refuses a port another process is using.
- The dev server logs to `.wt/dev.log` inside the worktree (gitignored).
- `destroy` refuses when the worktree has uncommitted changes unless `--force`. It deletes the branch only when it is merged (a merged PR, including squash merges, or no commits beyond `origin/main`).
- When run by Claude Code (`CLAUDECODE=1`), `create` prefixes the name with `claude-` and writes a `.claude-worktree` file (created, branch, purpose), which git ignores through `.git/info/exclude`.

### Source layout

`src/` is grouped by feature. Full rules and the "where does new code go" table: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).

```
src/
├── main.tsx      Vite entry
├── app/          App, providers, query client, router
├── routes/       TanStack Router routes: loaders, search schemas, thin pages
├── features/     champions, build-calculator, item-shop (a feature never imports another)
├── data/         game data loading: services (fetch + Zod) and hooks
├── components/   common/ shared app UI (ui/ for primitives, when they exist)
├── lib/          pure code, including the stats engine in lib/stats
├── assets/       images imported by code
└── styles/       global SCSS
```

Files and folders are kebab-case, `@/` resolves to `src/`, and Biome enforces the naming and import rules in CI.

### Deployment

The app is served by Cloudflare Workers static assets (`wrangler.jsonc`), with SPA fallback for deep links and cache rules in `public/_headers`. A small Worker (`worker/index.ts`) runs first for `/data/*` and `/assets/*` so missing files there return an uncached 404 instead of `index.html`. Cloudflare Workers Builds deploys `main` to production (`wrangler deploy`) and creates a Worker Preview for every other branch (`wrangler preview`), commenting the preview URLs on the pull request. Manual equivalents: `bun run deploy` and `bun run preview` (both build first and require `wrangler login`).

### Game data

Champion and item data is static JSON under `public/data/`, generated by `bun run sync-data` from Data Dragon and CommunityDragon and committed to the repo. The app reads `/data/manifest.json` for the current patch, then `/data/<patch>/champions.json`, `champions/<key>.json` and `items.json`. Raw downloads are cached in `.cache/` (gitignored). The sync fails if a normalized item stat differs from the stat block Data Dragon shows in the item tooltip, unless the difference is listed with a reason in `scripts/sync-data/validate-item-stats.ts`.

The `Sync game data` workflow (`.github/workflows/sync-data.yml`) runs daily and on manual dispatch. When Data Dragon's latest version differs from `currentPatch` in `public/data/manifest.json`, it runs the sync plus the CI checks and opens or updates a draft PR on `chore/sync-game-data` with the new patch folder, the manifest and a per-patch summary of champion and item changes (`bun scripts/sync-data/diff-patches.ts --from <old> --to <new>`). Merging that PR deploys the new data.

## Built with

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![SASS](https://img.shields.io/badge/SASS-hotpink.svg?style=for-the-badge&logo=SASS&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)

## Contact

[![LinkedIn][linkedin-shield]][linkedin-url]


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=blue
[linkedin-url]: https://www.linkedin.com/in/caiodeoliveiralemos/
