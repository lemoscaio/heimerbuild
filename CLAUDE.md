# Heimerbuild

League of Legends build calculator: pick a champion, set its level (1-18), add up to 6 items and see the resulting stats. React SPA with no backend and no accounts (MVP part 1); MVP part 2 adds Clerk sign-in, still without an own backend.

## Stack

Bun, Vite, React, TypeScript, TanStack Query, Zod, Biome, SCSS, Cloudflare Workers static assets.

Planned (check the issue before assuming it landed): Vite 8, React 19 + React Compiler, TypeScript 7 (#32), TanStack Query v5 (#33), TanStack Router (#35), Tailwind 4 (#40).

## Commands

```bash
bun install           # install dependencies
bun run dev           # Vite dev server
bun run sync-data     # regenerate public/data/<patch>/ (--version x.y.z, --offline)
bun run check         # Biome lint + format check (check:write to fix)
bun run typecheck     # tsc --noEmit
bun run test          # bun test
bun run build         # typecheck + production build to dist/
bun run preview:local # serve dist/ locally
```

CI (`.github/workflows/ci.yml`) runs `biome ci`, typecheck, tests and build on every PR. Run them locally before pushing.

## Repository layout

- `src/`: the app. Structure and placement rules: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).
- `scripts/sync-data/`: data pipeline. `schemas/` holds the Zod schemas shared by the pipeline and the app.
- `public/data/`: generated game data, committed. Never edit by hand.
- `worker/`: tiny Worker that turns SPA fallbacks for missing `/data/*` and `/assets/*` into real 404s.
- `wrangler.jsonc`, `public/_headers`: hosting and cache rules.

## Game data pipeline

1. `bun run sync-data` downloads Data Dragon + CommunityDragon for a patch into `.cache/<version>/` (gitignored).
2. It normalizes champions and items (canonical stat names, Summoner's Rift shop filter) and validates them with the Zod schemas.
3. It writes `public/data/<patch>/{champions.json, champions/<key>.json, items.json}` and `public/data/manifest.json`.
4. The app reads the manifest for the current patch, then fetches that patch's files and parses them with the same schemas. Files are immutable per patch.

## Conventions

- React and TypeScript rules: [`.claude/rules/react-standards.md`](.claude/rules/react-standards.md) (auto-loaded for `src/**`).
- Where new code goes: [`docs/frontend-architecture.md`](docs/frontend-architecture.md).
- File and folder names are kebab-case, and a feature never imports another feature; Biome enforces both in CI once #96 lands.
- Biome is the only linter and formatter (tabs, double quotes, no semicolons). No ESLint or Prettier.

## Testing

- Behavior tests only, with `bun test`, co-located as `*.test.ts`.
- Test pure logic where mistakes are costly: stats engine, data pipeline, Worker, filters.
- A few Playwright end-to-end flows for the main user journeys (#76).
- No snapshot tests (UI or data) and no tests that assert static text or markup. Known exception: the snapshot in `scripts/sync-data/normalize-champions.test.ts`, pending conversion to explicit assertions in its own issue.

## Workflow

- Planning lives in GitHub Issues and [Project 3](https://github.com/users/lemoscaio/projects/3). Reference the issue in every PR.
- Branches: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`. Agent worktrees are `claude-`-prefixed.
- Everything in English: code, commits, PRs, docs.
- Commits and PR titles: lowercase conventional commits (`feat: add item tooltip`).
- PR body: Problem / Solution / Changes (+ Verification), ending with `Closes #N`.
- Open PRs as draft; the owner marks them ready. Squash merge only.
- No AI attribution anywhere: no `Co-Authored-By` trailers, no "Generated with" footers.
- Cloudflare Workers Builds deploys `main` and posts a preview URL on every PR branch.
