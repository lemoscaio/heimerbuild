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
- **Spend skill points like in the game.** Pick which ability gets each level's point, with the game's rank rules and the rank-up tooltip ("Damage 80 → 125"), and see the whole order and every ability's values per rank in the Skills tab; levels you leave alone follow the game's suggested order, and ranks that grant stats show on the stats panel.
- **Try a combo.** In the Combo tab, add attacks, abilities, summoner spells and waits in order and see each step's damage against a target (presets or your own health, armor and magic resist), the effects running, and whether and when it kills. Checked on the wiki for Annie, Brand, Braum, Ezreal, Garen, Janna, Jax, Leona, Lissandra, Lux, Maokai, Morgana, Nasus, Nautilus, Quinn, Rengar, Singed, Taric, Teemo, Veigar, Zac and Ziggs; other champions show what isn't modeled yet.
- **Share a build with a link.** The champion, level, items and skill points live in the URL.
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
├── features/     champions, build-calculator, item-shop, runes, skills, summoners, conditions (a feature never imports another)
├── data/         game data loading: services (fetch + Zod) and hooks
├── components/   ui/ shadcn/ui primitives, common/ shared app UI
├── lib/          pure code, including the stats engine in lib/stats, the effect model in lib/effects, one file per champion's rules in lib/champions and the analytics client in lib/analytics
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

Champion, item, rune and summoner spell data is static JSON under `public/data/`, generated by `bun run sync-data` from Data Dragon and CommunityDragon and committed to the repo. The app reads `/data/manifest.json` for the current patch, then `/data/<patch>/champions.json`, `champions/<key>.json`, `items.json`, `runes.json` and `summoner-spells.json`. Patch files are cached for a year as immutable, so each request carries the file's content hash from the manifest (`items.json?v=<hash>`): a data fix within a patch changes the URL, while unchanged files keep theirs. Raw downloads are cached in `.cache/` (gitignored). The sync fails if a normalized item stat differs from the stat block Data Dragon shows in the item tooltip, unless the difference is listed with a reason in `scripts/sync-data/validate-item-stats.ts`.

Each champion file also carries its abilities (`normalize-abilities.ts`): the passive and Q/W/E/R with name, plain-text description, icon and max rank from Data Dragon's `spells` and `passive`; cooldown and cost per rank from Data Dragon; and the lines of the game's rank-up tooltip (Data Dragon's `leveltip`, "Damage 80 → 125") with their per-rank values read from the spell's values in the CommunityDragon character bin (`DataValues`, the legacy `mEffectAmount` for `{{ e1 }}`, `castRange`, `mAmmoRechargeTime`, `mMaxAmmo`). The game files list rank 0 first, so rank 1 is their second value. A line whose value is not in the game files (a formula from another spell, for example) is left out and counted in the sync log. The bin's default Summoner's Rift `RecSpellRankUpInfo` becomes `recommendedOrder`, the game's suggested skill order. Spot-checked against the League of Legends Wiki on 16.19 (Ahri, Cassiopeia, Amumu, Twisted Fate, Tryndamere, Garen, Annie, Jinx, Lux, Udyr, Jayce, Yuumi, Kennen, Teemo): every value matched.

Each ability, the passive and the other forms' abilities included, also carries the damage its tooltip shows and its cast time (`damage-formulas.ts`), which the combo simulator reads (`docs/frontend-architecture.md`, Combat). The tooltip (`generatedtip_spell_<spell>_tooltipcontent` in CommunityDragon's `lol.stringtable.json`) names each damage as a calculation inside a `<physicalDamage>`, `<magicDamage>` or `<trueDamage>` tag; values for minions, monsters or structures are left out. The calculation comes from the spell's `mSpellCalculations` and becomes a typed `DamageFormula`: a sum of parts, each a flat value or a ratio of a stat, times an optional multiplier, every number fixed, by rank (`byRank`, from rank 1) or by champion level (`byLevel`, levels 1 to 18). The sync reads named spell values, numbers, `ByCharLevelInterpolation` (linear from level 1 to 18, or along the stat growth curve with `mScaleByStatProgressionMultiplier`), `ByCharLevelBreakpoints`, per-level tables (`ByCharLevelFormula`, `values[level]`), stat ratios (`StatByNamedDataValue`, `StatByCoefficient`, `StatBySubPart`: `mStat` 0 ability power, 1 armor, 2 attack damage, 6 magic resist, 7 movement speed, 8 critical strike chance, 12 maximum health, 29 lethality; `mStatFormula` 1 base, 2 bonus, else total), summed sub-parts (their parts added) and multiplied ones (when one side is a number, it scales the other's parts), a calculation scaled from another (`GameCalculationModified`) and another spell's calculation (`@spell.GnarQ:MiniTotalDamage@`).
A percentage whose tooltip text names the target's health ("% max Health", "missing Health", "of their maximum Health") becomes a share of it (`ofTargetHealth`: `maximum`, `current` or `missing`), the formula giving the fraction: a calculation the game shows as a percent (`mDisplayAsPercent`) is one already, a value followed by `%` is in hundredths (a `multiplier` of 0.01), and its stat parts scale the share (Shen's Q: 2% + 1.5% per 100 AP). Anything else (another percentage, a stat times a stat, buff counters, attack speed and critical strike damage ratios, the ability resource, a passive value by rank) keeps the damage with `notModeled` and the reasons, never a guessed number. The cast time is `mCastTime`, else `spellCastTime` (a negative one means none); where the wiki disagrees for a curated champion, the champion's `defineCastTimes` overrides it (Data overrides). `bun run sync-data --coverage-report <file>` writes, as Markdown, how much damage the sync read per champion and ability (modeled, partial, not modeled), with the reasons; the sync log prints the total and the sync PR includes the report. Spot-checked against the wiki on 16.19 (Quinn, Ezreal, Annie, Ahri, Veigar, Xerath, Ziggs, Ashe, Malphite, Lissandra, Viktor, Teemo, Diana, Draven; with the shares of health: Brand, Braum, Camille, Darius, Fiddlesticks, Janna, Kalista, Leona, Lux, Maokai, Malzahar, Morgana, Nautilus, Sett, Shen, Singed, Taric, Vayne, Zac): every read base value and ratio matched; the game files' cast time is the animation's and sometimes set on abilities the wiki lists without one.

Each champion also carries its basic attack's windup (`attackWindup`, `normalize-attack-windup.ts`), the share of the attack time that passes before the attack lands, which the combo simulator reads: from the CommunityDragon `basicAttack`, `mAttackCastTime` ÷ `mAttackTotalTime` when the attack sets them, else 0.3 + `mAttackDelayCastOffsetPercent` (wiki "Attack speed", Windup), and the windup modifier `mAttackDelayCastOffsetPercentAttackSpeedRatio` (1 when absent). The schema keeps the percent between 0 and 1 and the modifier between 0 and 1, and an attack with only one of the two times fails the sync. Checked against the wiki's champion data on 16.19: 158 of the 171 champions it lists match; the PR for issue 395 lists the 13 others, and the sync keeps the game files' values. Senna's level-based windup (`mOverrideAutoattackCastTime`) and the other forms' attacks are not read.

A form with abilities of its own (Cannon Jayce's Shock Blast, Cougar Nidalee's Takedown) gets them in `abilities.forms.<form id>`, by slot, from `FORM_ABILITY_RULES` in `scripts/sync-data/form-abilities.ts` (each rule in its champion's file, Data overrides), each with `since`, a reason and a source (`normalize-form-abilities.ts`). Data Dragon lists one spell per slot, so the sync reads the other form's spell object in the character bin (cooldown, mana cost, CommunityDragon icon) and its name, summary and rank-up lines from CommunityDragon's `lol.stringtable.json`. Riot names a shared slot after both forms ("To the Skies! / Shock Blast"): each form keeps its part, and `splitDescription` splits a description written for both, one paragraph each. When a spell's own tooltip has no lines (Mega Gnar's Boulder Toss) or stale ones (Elise's Human Form), the rule names the lines it takes from the default ability. A rule whose spell is the slot's own (Jinx's `JinxQ`) keeps the ability and changes only how the form shows it, and `default` does the same for the default form: another of the spell's icons (Jinx's Pow-Pow and Fishbones, Cougar Nidalee's R, Mini Gnar's grey GNAR!, dismounted Kled's grey Jousting and Chaaaaaaaarge!!!), its own lines, or a game text naming and describing the mode ("Switcheroo! (Pow-Pow)", from the `JinxQIcon` buff). A `passive` rule picks the passive's icon per form (Jayce's hammer and cannon, dismounted Kled's fleeing Skaarl). An ability a form can't cast carries `unavailable` with the reason to show ("Unavailable as Mini Gnar"; dismounted Kled's Violent Tendencies, Jousting and Chaaaaaaaarge!!!), set in the rule with a wiki source and never inferred from a grey icon (Violent Tendencies has none); its rank still counts for the slot. Every champion with forms is audited slot by slot in `form-abilities.test.ts`; Shyvana's and Bel'Veth's game files have one icon and one text per ability, so their forms show the same abilities. A form ability keeps its slot's max rank, so ranks, the skill order and the link stay per slot; the sync fails when a `RANK_STAT_RULES` entry sits on a slot a form swaps. Spot-checked against the wiki on 16.19 (Shock Blast, Hyper Charge, Acceleration Gate, Venomous Bite, Skittering Frenzy, Rappel, Human Form, Boulder Toss, Wallop, Crunch, Pocket Pistol): every value matched.

Summoner spells (`normalize-summoner-spells.ts`, `summoner-spells.json`) are Data Dragon's `summoner.json` limited to the Summoner's Rift mode (`CLASSIC`: Barrier, Cleanse, Exhaust, Flash, Ghost, Heal, Ignite, Smite, Teleport), each with Riot's numeric key as `id` (the one build links use), name, icon, cooldown and short description. Their values come from the spell objects in CommunityDragon's `game/shared.cdtb.bin.json` (`Shared/Spells/<key>`): every `DataValues` entry, and the spell calculations the tooltip shows, evaluated for levels 1 to 18 (`ByCharLevelInterpolation` is linear from level 1 to 18, `ByCharLevelBreakpoints` adds a per-level bonus that changes at each breakpoint). The tooltip becomes `longDescription` with its numbers filled in ("70–475" for a value that grows with level); a placeholder the game files cannot fill, or a cooldown that differs between Data Dragon and the game files, fails the sync. Smite also gets its charges (2, recharging in 90 s); its upgrades (Unleashed and Primal Smite) are in-game progress, not separate spells, so only their damage values are kept (`smiteupgradeddamage`, `smite2ndupgradeddamage`). Mode-only spells (ARAM's Clarity and Mark, Arena's, Swarm's and URF's variants) are left out. Spot-checked against the League of Legends Wiki on 16.19: Ignite 70 / 150 / 175 / 475 at levels 1 / 5 / 6 / 18, Heal 80 + 14 per level, Barrier 100 to 460 and Ghost 24% to 48% (the wiki's ranges run to level 20 on the same formulas: 525, 346, 502.35 and 50.82%), Exhaust 40% slow and 35% damage reduction for 3 s, Cleanse 75% tenacity for 3 s, Smite 600 / 1000 / 1400 and cooldowns all matched.

The `Sync game data` workflow (`.github/workflows/sync-data.yml`) runs daily and on manual dispatch. When Data Dragon's latest version differs from `currentPatch` in `public/data/manifest.json`, it runs the sync plus the CI checks and opens or updates a draft PR on `chore/sync-game-data` with the new patch folder, the manifest, a per-patch summary of champion and item changes (`bun scripts/sync-data/diff-patches.ts --from <old> --to <new>`) and the ability damage coverage report. Merging that PR deploys the new data.

#### Data overrides

When Riot's data is wrong (Titanic Hydra tagged `HealthRegen` without any health regen, for example), fix it with an override instead of editing `public/data/` by hand. Overrides live in `scripts/sync-data/overrides/`: items in `item-overrides.ts`; champions in their own file, `scripts/sync-data/champions/<champion>.ts`, with `defineChampionOverride` (detail fields only, so `champions.json` and `champions/<key>.json` never disagree), listed in `CHAMPION_OVERRIDES` (`champion-overrides.ts`). Each one changes a single field of a single item or champion:

```ts
defineItemOverride({
	id: "titanic-hydra-no-health-regen-tag", // unique, kebab-case
	itemId: "3748",
	field: "tags",
	since: "16.19", // first patch it applies to (major.minor)
	until: undefined, // optional last patch; open-ended by default
	reason: "Riot tags it HealthRegen, a leftover from an older version",
	source: "https://wiki.leagueoflegends.com/en-us/Titanic_Hydra", // optional
	apply: (tags) => tags.filter((tag) => tag !== "HealthRegen"),
})
```

The sync applies the overrides for the patch it syncs after normalizing and before validating, so a wrong fix still fails the schema and `<stats>` checks. It logs each applied override and fails on a duplicate id or on two overrides of the same field with overlapping ranges. When an override changes nothing (Riot fixed the data) or its item or champion is gone, the sync warns and the daily sync PR lists it under "Overrides no longer needed": set its `until` to the last patch that needed it. If a bug skips a patch, add a second override with its own range. After adding an override, rerun `bun run sync-data --version <patch>` for the patches it covers and commit the regenerated files.

**Where to find a champion's rules:** each champion with sync rules has one file, `scripts/sync-data/champions/<champion>.ts` (the champion key in kebab-case: `rek-sai.ts`), opening with a short list of its quirks. It holds the champion's data fixes, level states, forms, form abilities, skill rules, cast times and rank stats, each export named after its override id (`GNAR_FORMS` is `gnar-forms`); rank stats have no id and are named after their stat (`OLAF_ARMOR_RANK_STAT`). The `define*` helpers are in `overrides/define-champion-overrides.ts` and shared values (`WIKI`, `WIKI_DATA`, the common skill rules) in `champions/rule-helpers.ts`. Each kind's table lists the champions' exports alphabetically: `CHAMPION_LEVEL_STATES`, `CHAMPION_FORMS`, `CHAMPION_SKILL_RULES` and `CHAMPION_CAST_TIMES` in `overrides/`, joined in `CHAMPION_OVERRIDES`, `FORM_ABILITY_RULES` in `form-abilities.ts` and `RANK_STAT_RULES` in `rank-stats.ts`; a champion's first rule creates its file and adds the export to its table. The same champion's app rules (ability effects, combo hit rules) are in `src/lib/champions/<champion>.ts` ([`docs/frontend-architecture.md`](docs/frontend-architecture.md), Where to find a champion's rules).

Stats that change with the level alone (Kayle turns ranged at level 6, Tristana's range grows to 700) are missing from Riot's data rather than wrong. They go in the champion's file with `defineLevelStates`, listed in `CHAMPION_LEVEL_STATES`, which takes the same `id`, `since`, `reason` and `source` plus a `levelStates` list, and the sync writes it to the champion's `levelStates`:

```ts
levelStates: [
	{ fromLevel: 6, attackType: "ranged", attackRange: { base: 525, perLevel: 0 } },
	{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
]
```

The stats engine applies every state the selected level has reached, in order, each one replacing only the fields it sets. A stat with `growth: "linear"` adds `perLevel` once per level instead of following the champion growth curve.

Forms the player switches between (Mini and Mega Gnar, Human and Cougar Nidalee) go in the champion's file with `defineForms`, listed in `CHAMPION_FORMS`, the same way, and the sync writes them to the champion's `forms`. The first form is the default: Riot's data, so it has only an `id`, a `name` and an optional `gameName` (Jinx's Minigun is "Pow-Pow" in game, shown in a tooltip). Every other form may set `attackType`, any growth stats it replaces, its own `levelStates`, which replace the champion's (Mega Gnar has none, so he keeps 175 range), and `requires: { slot, minRank }` when it needs an ability point (Shyvana's Dragon needs R):

```ts
forms: [
	{ id: "mini", name: "Mini Gnar" },
	{ id: "mega", name: "Mega Gnar", attackType: "melee", stats: { attackRange: { base: 175, perLevel: 0 } } },
]
```

The stats engine applies the selected form first, then the level states. The form `id` is what the share link carries (`?form=mega`); a form whose ability rank is missing falls back to the default. A form keeps only its fixed part here: a bonus that depends on an ability rank, the champion level or another stat is an effect bound to the form (`docs/frontend-architecture.md`, Forms).

Skill points follow the game's default rules (one point per level, a basic ability's rank n at level 2n - 1, R at 6/11/16, max ranks from Data Dragon). Champions that differ (Elise starts with an R rank, Udyr's R ranks like a basic ability, Azir's first point is W, Shen's W needs Q first, Aphelios's points raise stats) go in the champion's file with `defineSkillRules`, listed in `CHAMPION_SKILL_RULES`, the same way, and the sync writes them to the champion's `skillRules`:

```ts
skillRules: { innateRanks: { R: 1 }, rankLevels: { R: [1, 6, 11, 16] } }
```

`rankLevels` lists the champion level each rank needs, rank 1 first, counting innate ranks. The sync fails when an ability has more ranks than levels to unlock them at.

Cast times the wiki gives differently from the game files (Quinn's Vault has none; the files give 0.25 s) go in the champion's file with `defineCastTimes`, listed in `CHAMPION_CAST_TIMES`, the same way, with the cast time by slot (0 is none). They are checked for the combo's curated champions only.

Cooldowns Data Dragon gets wrong go in the champion's file with `defineCooldowns`, listed in `CHAMPION_OVERRIDES`, with the seconds per rank by slot. Cast times, cooldowns and damage formulas all change a champion's `abilities`, so the sync refuses two of them for one champion in overlapping patches: a champion that needs more than one kind gets one `defineAbilityFixes` (`castTimes`, `cooldowns`, and `damage`: a function per slot from the synced formulas to the fixed ones), listed in `CHAMPION_OVERRIDES` (Rengar's cooldowns and R cast time; Nasus's Siphoning Strike stacks, read as a `counter` part the build's match stacks give; Garen's Judgment bonus against the nearest enemy).

Stats an ability grants by its rank alone (Twisted Fate's Stacked Deck: 15% to 55% attack speed) are not overrides: their values are in the game files. A rule in the champion's file, listed in `RANK_STAT_RULES` (`scripts/sync-data/rank-stats.ts`), names the spell value for each one (`dataValue`, with a `scale` into the stat's unit, a reason and a wiki source), and the sync writes the per-rank values to the champion's `rankStats`; a renamed value fails the sync. The stats engine adds them as bonus stats from the ability ranks of the skill order.

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
