# Heimerbuild

League of Legends build calculator: pick a champion, set its level (1-18), add up to 6 items and see the resulting stats. React SPA with no backend and no accounts (MVP part 1); MVP part 2 adds Clerk sign-in, still without an own backend.

## Stack

Bun, Vite 8, React 19 with the React Compiler, TypeScript 7, TanStack Query 5, TanStack Router, Zod, Biome, Tailwind 4 with shadcn/ui (Base UI primitives), Cloudflare Workers static assets, Sentry (`@sentry/react`), PostHog (`posthog-js`).

## Commands

```bash
bun install           # install dependencies
bun run dev           # Vite dev server
bun run sync-data     # regenerate public/data/<patch>/ (--version x.y.z, --offline)
bun run check         # Biome lint + format check (check:write to fix)
bun run typecheck     # tsc on the app (tsconfig.json) and on tests, scripts and worker (tsconfig.test.json)
bun run test          # bun test
bun run e2e           # Playwright flows (e2e/) against a local build, or BASE_URL=<url>
bun run build         # typecheck + production build to dist/
bun run preview:local # serve dist/ locally
bun scripts/visual/capture.ts capture --url <url> --out <dir>             # screenshots of the main screens
bun scripts/visual/capture.ts compare --before <dir> --after <dir> [--diff <dir>]  # per-screen pixel diff %
```

CI (`.github/workflows/ci.yml`) runs `biome ci`, typecheck, tests and build on every PR. Run them locally before pushing. `.github/workflows/e2e.yml` runs the Playwright flows against the PR's Cloudflare preview (local build fallback).

## Repository layout

- `src/`: the app. Structure and placement rules: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).
- `scripts/sync-data/`: data pipeline. `schemas/` holds the Zod schemas shared by the pipeline and the app.
- `public/data/`: generated game data, committed. Never edit by hand.
- `worker/`: tiny Worker that turns SPA fallbacks for missing `/data/*` and `/assets/*` into real 404s, tunnels Sentry envelopes posted to `/monitoring` (our project only) and proxies `/ingest/*` to PostHog (our region's hosts only).
- Telemetry keys are build variables, never committed: `VITE_SENTRY_DSN` and `VITE_POSTHOG_KEY` (Workers Builds variables; locally in `.env.local`, see `.env.example`). A build without one never starts that tool.
- Sentry: `src/app/sentry.ts` (ingest host and project in `sentry-config.ts`); on in preview and production builds, off locally unless `VITE_SENTRY_ENABLED=true` and never started in Playwright flows (`window.__HB_E2E__`, set in `e2e/fixtures.ts`); source maps upload only when the `SENTRY_AUTH_TOKEN` build secret exists.
- PostHog: `src/app/posthog.ts` (cloud region in `posthog-config.ts`), lazy-loaded after the first render, cookieless (no cookies or storage until the consent banner, #59), same on/off rules as Sentry (`should-init-telemetry.ts`, local flag `VITE_POSTHOG_ENABLED=true`). Track events only through `track()` from `src/lib/analytics/analytics.ts`, declaring them in `analytics-events.ts`; read flags with `useFeatureFlag()` (`src/hooks/`).
- `wrangler.jsonc`, `public/_headers`: hosting and cache rules.

## Game data pipeline

1. `bun run sync-data` downloads Data Dragon + CommunityDragon for a patch into `.cache/<version>/` (gitignored).
2. It normalizes champions, items and runes (canonical stat names, Summoner's Rift shop filter, `from`/`into` limited to shop items; rune trees from Data Dragon `runesReforged.json`, stat shards from CommunityDragon `perks.json`/`perkstyles.json`, their values read from the shard descriptions by `SHARD_STAT_RULES` in `normalize-runes.ts`; rune long descriptions become rich text data by `rune-text.ts`, and a placeholder Riot left unresolved (`@f3@`) fails the sync until `RUNE_PLACEHOLDER_VALUES` gives its number) and validates them with the Zod schemas.
   Champion abilities (passive, Q/W/E/R: names, icons, ranks, cooldown and cost per rank, and the rank-up tooltip lines with per-rank values from the CommunityDragon character bins; cast times and the tooltip's damage formulas from `damage-formulas.ts`, unreadable parts marked `notModeled`, with a coverage report by `--coverage-report`) come from `normalize-abilities.ts`, and the abilities another form swaps in (Cannon Jayce's Shock Blast) from `normalize-form-abilities.ts` with `FORM_ABILITY_RULES`; see README, Game data.
   Summoner's Rift summoner spells (Data Dragon `summoner.json`, mode `CLASSIC`) get their per-level values from the CommunityDragon `shared.cdtb.bin.json` spell objects (`normalize-summoner-spells.ts`; README, Game data).
   Item stats must also match the `<stats>` block of each Data Dragon item description; known differences go in `ITEM_STAT_ALLOWLIST` (`scripts/sync-data/validate-item-stats.ts`), each with a reason.
   A purchase group of several items needs a name in `ITEM_GROUP_LABELS` (`item-groups.ts`, used by the shop's `group:` filter), and the anti-heal flag (`<keyword>Wounds</keyword>` in the description) must agree with CommunityDragon's `Grievous*` data values; otherwise the sync fails.
   Known bugs in Riot's data are fixed by typed overrides in `scripts/sync-data/overrides/`, applied before validation; a champion's overrides, forms and skill rules live in its own file in `scripts/sync-data/champions/` (README, Data overrides).
3. It writes `public/data/<patch>/{champions.json, champions/<key>.json, items.json, runes.json, summoner-spells.json}` and `public/data/manifest.json`, which lists a content hash per data file.
4. The app reads the manifest (revalidated on every load) for the current patch, then fetches that patch's files as `/data/<patch>/<file>?v=<hash>` and parses them with the same schemas. Patch files are cached as immutable; a changed file gets a new hash, so a new URL.
5. `.github/workflows/sync-data.yml` runs the sync daily and opens a PR (`chore/sync-game-data`) when a new patch ships; it never pushes to `main`.

## Conventions

- React and TypeScript rules: [`.claude/rules/react-standards.md`](.claude/rules/react-standards.md) (auto-loaded for `src/**`).
- Where new code goes: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).
- File and folder names are kebab-case, and layers import one way (`app → routes → pages → features → shared`: pages compose features, a feature never imports another feature or a page); Biome enforces both in CI (`biome.json`). Import other layers through the `@/` alias (`@/data/...`) and the game data schemas through `@schemas/` (`@schemas/item`).
- Biome is the only linter and formatter (tabs, double quotes, no semicolons). No ESLint or Prettier.
- A lefthook pre-commit hook (`lefthook.yml`, installed by `bun install`) runs `biome check --write` on staged files and re-stages them; it never blocks on unfixable errors, so still run `bunx biome ci` before pushing.

## Testing

- Behavior tests only, with `bun test`, co-located as `*.test.ts`.
- Tests, `scripts/`, `worker/` and `vite.config.ts` are type-checked by `tsconfig.test.json` (Bun types). The app config `tsconfig.json` has no Bun or Node types, so browser code cannot use their globals.
- Test pure logic where mistakes are costly: stats engine, data pipeline, Worker, filters.
- A few Playwright end-to-end flows for the main user journeys, in `e2e/*.e2e.ts` (the suffix keeps them out of `bun test`). Chromium only, Data Dragon blocked (never depend on icons), locators by role and accessible name only: no CSS selectors, no copy or snapshot assertions. Add a flow only for a real regression.
- No snapshot tests (UI or data) and no tests that assert static text or markup.

## Workflow

- Planning lives in GitHub Issues and [Project 3](https://github.com/users/lemoscaio/projects/3). Reference the issue in every PR.
- Branches: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`. Agent worktrees are `claude-`-prefixed; `scripts/wt create` does that and writes `.claude-worktree` (see README, Worktrees).
- Everything in English: code, commits, PRs, docs.
- Commits and PR titles: lowercase conventional commits (`feat: add item tooltip`).
- PR body: Problem / Solution / Changes (+ Verification), ending with `Closes #N`.
- Open PRs as draft; the owner marks them ready. Squash merge only.
- No AI attribution anywhere: no `Co-Authored-By` trailers, no "Generated with" footers.
- Cloudflare Workers Builds deploys `main` and posts a preview URL on every PR branch.
