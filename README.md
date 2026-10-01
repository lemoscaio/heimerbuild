<div align="center"><img style="width:100%;" src="https://i.imgur.com/lslR2VY.gif"></div>
<hr>
<h2 align=center>Heimerbuild</h2>
<h4 align=center>A League of Legends build calculator with game-accurate numbers.</h4>
<p align=center><a href="https://heimerbuild.caio-lemos94.workers.dev">heimerbuild.caio-lemos94.workers.dev</a></p>
<br>
<div align=center>
    <img style="width:750px;" src="https://i.imgur.com/tkxIZ4f.png">
</div>
<br><hr>

## Features

- **Every champion, always on the current patch.** Game data is pulled from Riot's Data Dragon and CommunityDragon and refreshed automatically when a new patch ships.
- **Stats that match the game.** Level growth, attack speed and item bonuses follow the in-game formulas, and item data is checked against the game's own tooltips.
- **Build from level 1 to 18 with up to 6 items**, and see base, bonus and total for every stat.
- **Know when a build isn't possible in-game.** Build what you want; if it breaks a game rule (two pairs of boots, two copies of a legendary), Heimerbuild tells you which rule and why.
- **Find the right item fast.** Filter the shop by role or by stats, sort it by any stat, and check price, stats and description in a tooltip.
- **Share a build with a link.** The champion, level and items live in the URL.
- **Champion details:** roles, attack type and lore.

## Why Heimerbuild

League is a game of numbers. A small change to an AD ratio can reshape the meta, and deciding between two items often comes down to math the client never shows you. Practice Tool can answer some of it, but it means starting a match, buying items and reading numbers by hand.

Heimerbuild answers those questions in seconds, with numbers you can trust. Today it covers champion and item stats. Next up:

- **Damage calculator:** auto-attack and ability damage against a chosen champion, damage taken, and eventually full combos.
- **More build parameters:** runes, item stacks, dragons and role quest rewards.
- **Build suggestions** based on win rates, and **pro builds**.
- **Community builds** that players can publish, explain and vote on.

## Development

This project uses [Bun](https://bun.com) as package manager and script runner (version pinned in `package.json` under `packageManager`). Install it with `curl -fsSL https://bun.com/install | bash`.

```bash
bun install           # install dependencies (creates node_modules from bun.lock)
bun run dev           # start the Vite dev server
bun run build         # typecheck and build to dist/
bun run preview:local # serve the production build locally
bun run typecheck     # type-check the app and the tests, scripts and worker
bun run test          # run tests with bun test
bun run e2e           # Playwright flows in e2e/ against a local build (BASE_URL=<url> targets a deployed site)
bun run check         # lint and format check with Biome
bun run check:write   # apply Biome formatting and safe fixes
```

CI (`.github/workflows/ci.yml`) runs `biome ci`, the typecheck, the tests and the build on every pull request and push to `main`. The E2E workflow (`.github/workflows/e2e.yml`) runs the Playwright flows on every pull request, inside the official Playwright container matching `@playwright/test`, against its Cloudflare preview once the preview's `/version.json` names the PR head commit, or against a local build when no such preview shows up, and uploads the Playwright trace when a flow fails.

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
├── app/          App, providers, query client, router, Sentry and PostHog setup
├── routes/       TanStack Router routes: path, search schemas, loaders, head, fallbacks
├── pages/        home and champion-build: compose features into screens
├── features/     champions, build-calculator, item-shop, runes (a feature never imports another)
├── data/         game data loading: services (fetch + Zod) and hooks
├── components/   ui/ shadcn/ui primitives, common/ shared app UI
├── lib/          pure code, including the stats engine in lib/stats and the analytics client in lib/analytics
├── hooks/        hooks shared by features (useFeatureFlag)
├── assets/       images imported by code
└── styles/       Tailwind entry and theme (app.css)
```

Files and folders are kebab-case, `@/` resolves to `src/`, and Biome enforces the naming and import rules in CI.

### Deployment

The app is served by Cloudflare Workers static assets (`wrangler.jsonc`), with SPA fallback for deep links and cache rules in `public/_headers`. A small Worker (`worker/index.ts`) runs first for `/data/*` and `/assets/*` so missing files there return an uncached 404 instead of `index.html`, for `/monitoring` to forward Sentry events, and for `/ingest/*` to proxy PostHog. Cloudflare Workers Builds deploys `main` to production (`wrangler deploy`) and creates a Worker Preview for every other branch (`wrangler preview`), commenting the preview URLs on the pull request. Manual equivalents: `bun run deploy` and `bun run preview` (both build first and require `wrangler login`).

### Telemetry keys

The Sentry DSN and the PostHog project key are not in the repository: builds read them from the `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY` build variables (set in Cloudflare Workers Builds for preview and production). A build without them, such as a fork or GitHub CI, never starts Sentry or PostHog. To send from your machine, copy `.env.example` to `.env.local`, fill in the key and set `VITE_SENTRY_ENABLED=true` or `VITE_POSTHOG_ENABLED=true`; local events go straight to Sentry and PostHog tagged `environment = development`.

### Error monitoring

Sentry (`@sentry/react`, set up in `src/app/sentry.ts`) reports errors, sampled traces and on-error session replays from preview and production deploys, sent through the Worker's `/monitoring` tunnel so ad-blockers do not drop them. Builds without `VITE_SENTRY_DSN` send nothing, local builds send nothing unless `VITE_SENTRY_ENABLED=true`, and the Playwright flows mark their pages (`window.__HB_E2E__`) so Sentry never starts during E2E runs. When the `SENTRY_AUTH_TOKEN` build secret is set, Workers Builds uploads hidden source maps for the commit SHA release and deletes them from `dist/`.

### Product analytics

PostHog (`posthog-js`, set up in `src/app/posthog.ts`; cloud region in `posthog-config.ts`, key in `VITE_POSTHOG_KEY`) records pageviews, the autocapture and web vitals enabled in the project settings, and the custom events declared in `src/lib/analytics/analytics-events.ts` (sent with `track()`), plus feature flags through `useFeatureFlag()`. It runs in cookieless mode, so it sets no cookies and writes nothing to local or session storage until the consent banner exists. The SDK loads in its own chunk after the first render and talks to PostHog through the Worker's `/ingest/*` proxy, so ad-blockers do not drop events. Session replay and exception capture stay off (Sentry owns both). Every event carries `environment` (`production`, `preview`, `development`) and `release` (commit SHA). It follows Sentry's rules: nothing without `VITE_POSTHOG_KEY`, nothing locally unless `VITE_POSTHOG_ENABLED=true`, and never during the Playwright flows.

### Game data

Champion, item and rune data is static JSON under `public/data/`, generated by `bun run sync-data` from Data Dragon and CommunityDragon and committed to the repo. The app reads `/data/manifest.json` for the current patch, then `/data/<patch>/champions.json`, `champions/<key>.json`, `items.json` and `runes.json`. Patch files are cached for a year as immutable, so each request carries the file's content hash from the manifest (`items.json?v=<hash>`): a data fix within a patch changes the URL, while unchanged files keep theirs. Raw downloads are cached in `.cache/` (gitignored). The sync fails if a normalized item stat differs from the stat block Data Dragon shows in the item tooltip, unless the difference is listed with a reason in `scripts/sync-data/validate-item-stats.ts`.

The `Sync game data` workflow (`.github/workflows/sync-data.yml`) runs daily and on manual dispatch. When Data Dragon's latest version differs from `currentPatch` in `public/data/manifest.json`, it runs the sync plus the CI checks and opens or updates a draft PR on `chore/sync-game-data` with the new patch folder, the manifest and a per-patch summary of champion and item changes (`bun scripts/sync-data/diff-patches.ts --from <old> --to <new>`). Merging that PR deploys the new data.

#### Data overrides

When Riot's data is wrong (Gunmetal Greaves missing its `Boots` tag, for example), fix it with an override instead of editing `public/data/` by hand. Overrides live in `scripts/sync-data/overrides/`: items in `item-overrides.ts`, champions in `champion-overrides.ts` (detail fields only, so `champions.json` and `champions/<key>.json` never disagree). Each one changes a single field of a single item or champion:

```ts
defineItemOverride({
	id: "gunmetal-greaves-boots-tag", // unique, kebab-case
	itemId: "3172",
	field: "tags",
	since: "16.19", // first patch it applies to (major.minor)
	until: undefined, // optional last patch; open-ended by default
	reason: "Riot data has no Boots tag; it is the Berserker's Greaves upgrade",
	source: "https://github.com/lemoscaio/heimerbuild/issues/159", // optional
	apply: (tags) => [...tags, "Boots"],
})
```

The sync applies the overrides for the patch it syncs after normalizing and before validating, so a wrong fix still fails the schema and `<stats>` checks. It logs each applied override and fails on a duplicate id or on two overrides of the same field with overlapping ranges. When an override changes nothing (Riot fixed the data) or its item or champion is gone, the sync warns and the daily sync PR lists it under "Overrides no longer needed": set its `until` to the last patch that needed it. If a bug skips a patch, add a second override with its own range. After adding an override, rerun `bun run sync-data --version <patch>` for the patches it covers and commit the regenerated files.

Stats that change with the level alone (Kayle turns ranged at level 6, Tristana's range grows to 700) are missing from Riot's data rather than wrong. They go in `champion-level-states.ts` with `defineLevelStates`, which takes the same `id`, `since`, `reason` and `source` plus a `levelStates` list, and the sync writes it to the champion's `levelStates`:

```ts
levelStates: [
	{ fromLevel: 6, attackType: "ranged", attackRange: { base: 525, perLevel: 0 } },
	{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
]
```

The stats engine applies every state the selected level has reached, in order, each one replacing only the fields it sets. A stat with `growth: "linear"` adds `perLevel` once per level instead of following the champion growth curve.

## Built with

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Bun](https://img.shields.io/badge/bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white)
![TanStack](https://img.shields.io/badge/tanstack-%23FF4154.svg?style=for-the-badge&logo=reactquery&logoColor=white)
![Zod](https://img.shields.io/badge/zod-%233068b7.svg?style=for-the-badge&logo=zod&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/cloudflare%20workers-%23F38020.svg?style=for-the-badge&logo=cloudflareworkers&logoColor=white)
![Biome](https://img.shields.io/badge/biome-%2360A5FA.svg?style=for-the-badge&logo=biome&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-%23000000.svg?style=for-the-badge&logo=shadcnui&logoColor=white)

## Data and legal

Game data comes from Riot Games' [Data Dragon](https://developer.riotgames.com/docs/lol#data-dragon) and [CommunityDragon](https://www.communitydragon.org/).

Heimerbuild isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

## Contact

[![LinkedIn][linkedin-shield]][linkedin-url]


<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=blue
[linkedin-url]: https://www.linkedin.com/in/caiodeoliveiralemos/
