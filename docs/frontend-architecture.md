# Frontend Architecture

Target structure for `src/`, grouped by feature instead of by file type. Component and hook rules: [`.claude/rules/react-standards.md`](../.claude/rules/react-standards.md).

> **Migration:** the tree follows this structure since #96 (kebab-case) and #42 (feature folders), and styling is Tailwind and shadcn/ui only since #40. Nothing is pending (see the [Migration map](#migration-map)).

## Target structure

```
src/
├── main.tsx              Vite entry: starts Sentry and the stale-chunk reload, mounts <App /> and global styles, then starts PostHog; nothing else
├── app/                  app shell: App, providers, query client, router (route tree), Sentry and PostHog setup
├── routes/               TanStack Router code routes: one *-route.tsx per route (path, search, loader, head, fallbacks)
├── pages/                one folder per page: composes features into its screens
│   ├── home/             champion browser and recent builds
│   └── champion-build/   the build page: picks the screen (overview, expanded shop, mobile), useChampionBuild, useBuildPage
├── features/             feature slices, never import each other
│   ├── champions/        champion grid, search, champion header and skills; champion state (level, form, current health)
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   ├── item-shop/        item grid, role/stat filters, sorting, tooltips
│   ├── runes/            rune page editor (trees, runes, stat shards) and its summary card
│   ├── skills/           skill points: rank rules, suggested order and history, the skills row and Skills tab
│   ├── summoners/        the two summoner spell slots: picks, swap, checks against the patch's spells
│   ├── match/            the match state (useMatchState): the game time, one per match
│   └── conditions/       the conditional effects turned on or off (useConditions) and the Effects list
├── data/                 game data loading: fetch + Zod parsing, data hooks, query options
│   ├── services/         fetchGameData, fetchManifest, fetchChampion, fetchItems
│   ├── queries/          queryOptions() factories (gameDataQueries)
│   └── hooks/            use-current-patch.ts, use-champions.ts, use-champion.ts, use-items.ts, use-runes.ts, use-summoner-spells.ts
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   ├── motion/           generic motion primitives (Collapse, Stagger) and motion tokens
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, effect model (lib/effects), cn(), formatters, analytics (track, flags)
├── hooks/                hooks used by 2+ features, and generic ones (use-feature-flag.ts)
├── types/                types used by 2+ features (not derivable from a schema)
├── assets/               images imported by code
└── styles/               app.css: Tailwind entry, theme tokens, base styles
```

### Layers

Borrowed from [Feature-Sliced Design](https://feature-sliced.design/docs/get-started/tutorial) (only the layers we need) and [Bulletproof React's one-way dependencies](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md). A layer imports only the layers below it:

```
app → routes → pages → features → shared (components, hooks, lib, types, data)
```

- **Routes only route:** path, search validation, loader, `head`, the pending/error/not-found components and the (lazy) import of the page. No screen composition.
- **Pages compose features** into a screen: `pages/<page>/` holds the page component, its screens and the page-level hooks that wire features together (`useBuildPage`). A page may import features and shared layers, never a route.
- **Features** never import another feature, a page or a route.

### Page anatomy

```
pages/<page>/
├── <page>-page.tsx   the page component the route loads (named export)
├── <part>.tsx        one file per screen (overview-page.tsx) or page-only layout (home-layout.tsx)
├── hooks/            page-level hooks that compose feature hooks with page state
└── lib/              pure page-level rules that join features (tested with bun test)
```

A page reads its route through `getRouteApi("<route id>")`, never by importing the route file.

### Feature anatomy

```
features/<feature>/
├── components/   UI used only by this feature
├── hooks/        use-*.ts, with their query options
├── services/     feature IO: storage, URL encoding
├── lib/          pure functions for this feature (tested with bun test)
└── types/        feature-only types
```

- Create only the folders a feature needs.
- A component is one file (`champion-card.tsx`). It becomes a folder `champion-card/` only when it has sub-parts; `index.tsx` then holds the component itself, not a re-export list.
- No barrel files re-exporting a folder; import the file directly.
- `lib/` (root or feature) never imports React, so it stays trivially testable.

### Import boundaries

- **A feature never imports another feature. No exceptions.** Pages compose features; anything two features need is promoted to a shared layer.
- When two features interact, the page wires them with props and callbacks. Example: the champion build page calls `useBuildPage()` (its own hook, on top of `useChampionBuild`, which composes the domain hooks of seven features; see [Build composition](#build-composition)) and its screens pass `build.addItem` to `ItemShop` (item-shop) as `onItemAdd`; the shop never knows about the build.
- Features may import only the shared layers: `components/{ui,common}`, `lib`, `hooks`, `types`, `data`. Never `pages/` or `routes/`.
- Pages may import features and the shared layers, never `routes/`. Routes import pages.
- Shared layers never import from `features/`, `pages/` or `routes/`.
- CI enforces this with Biome `noRestrictedImports` overrides in `biome.json`: one override covers every feature (it bans `@/features/**`, any `../../` climb out of the feature, `pages/` and `routes/`), one covers `pages/`, one covers the shared layers. A feature imports its own files relatively (`../lib/x`), one folder level deep. **A new feature needs no config.**

```ts
// src/features/build-calculator/components/stats-panel.tsx

// Forbidden: another feature
import { ChampionCard } from "../../champions/components/champion-card"

// Allowed: shared layers
import { useChampion } from "@/data/hooks/use-champion"
import { computeStats } from "@/lib/stats/compute-stats"
```

### Game data boundary

- `src/data` is the only place that fetches and parses game data (`fetchGameData(path, schema)`) and exposes it through hooks and the `queryOptions()` factories in `src/data/queries/`. Every file under a patch is keyed by that patch and never goes stale (`staleTime: Infinity`). Its URL carries the content hash from the manifest (`?v=<hash>`), so a data fix within a patch is never hidden by the immutable HTTP cache.
- Schemas stay in `scripts/sync-data/schemas/`, shared with the pipeline. Their inferred types (`Champion`, `Item`, ...) may be imported anywhere, through the `@schemas/` alias (`@schemas/item`).

## Build composition

The build (everything the user builds for a champion) is **composed from one controlled hook per domain**. Domains never import each other: the page layer wires them, and their values only meet in the stats and in each saved edit.

```
pages/champion-build/
├── hooks/
│   ├── use-url-build-source.ts   the URL as the build source: writes the search, records recent builds
│   ├── use-champion-build.ts     data hooks + domain hooks + stats on a build source (the composer)
│   └── use-build-page.ts         useChampionBuild + view, tab, item selection, previews, form switch
└── lib/
    └── condition-values.ts       dropUnusedConditionValues: the composer's cleanup on save
```

| Domain | Hook | Feature | Value in the source |
| --- | --- | --- | --- |
| Champion state | `useChampionState` (level, form, current health) | `champions` | `level`, `form`, `currentHealth` |
| Skills | `useSkills` (ranks, order, kept points) | `skills` | `skills` |
| Items | `useBuildItems` (chosen items, full-build notice, announcement, item events) | `build-calculator` | `itemIds` |
| Rune page | `useRunePage` (checked page, stat shards) | `runes` | `runes` |
| Summoner spells | `useSummoners` (the two slots, pick, swap, clear) | `summoners` | `summoners` |
| Match state | `useMatchState` (game time) | `match` | `gameTime` |
| Conditions | `useConditions` (the effects turned on or off, with their values) | `conditions` | `effects` |

Each rule about a value lives in one place:

| Rule | Where |
| --- | --- |
| The value, its default and its setter (`currentHealth` is 100 and `gameTime` is 0 when absent; a setter saves the number as picked) | the domain hook (`useChampionState`, `useMatchState`) |
| A default stays out of the link (`hp` at 100, `min` at 0, like level 1 or no items) | the link writer, `toBuildSearch` |
| A condition value that no available effect uses is dropped (as given while the effects load) | the composer, `dropUnusedConditionValues` on every save |

- **Controlled domain hooks.** Each takes `value` + `onChange` and gets its data injected (champion, items, runes). It knows nothing about the URL, the browser history or the other domains, and keeps the given value while its data loads. Its rules live in the feature's `lib/` as pure functions with unit tests (`readRunePage`, `readBuildItems`, `readChampionState`, `readSummoners`); the hook stays thin and is covered by the e2e flows.
- **One build source.** `BuildSource` = `{ state, update(patch, navigation) }` (`features/build-calculator/types/build-source.ts`). `useUrlBuildSource` is the only place that writes the URL search (with `toBuildSearch`) and records recent builds; it also carries the page's view and tab, which are never recorded. A later source per build instance (an opponent, a comparison) plugs into the same composer.
- **The composer.** `useChampionBuild({ patch, championKey, source })` reads the game data, injects it, and saves each domain's change together with the checked values of every domain, so an edit still cleans a link's unknown items or invalid runes. It holds the explicit browser-history table (items push, so Back undoes them; champion state, skills, runes and summoner spells replace) and the cross-domain links (a level change also saves the skill points that level keeps or restores).
- **Pure stats.** `computeBuildStats({ champion, patch, level, form, items, shards, ranks, effects })` (`lib/stats/`). Every "what if" is `whatIf(change)`: a shop item preview (`items`), the other form (`form`), the next rank (`ranks`), the stats without runes (`shards: []`), an effect turned on (`effects`; see [Effects](#effects)).
- **Grouped by domain.** The build reads `build.championState.level`, `build.skills.ranks`, `build.items.add`, `build.runePage.selection`. Page screens (overview, expanded shop, mobile) receive the page object from `useBuildPage`; feature components receive props, never the whole build.
- **Hints between domains** are page wiring too: the runes that react to the chosen summoner spells come from `lib/summoner-rune-interactions.ts` (typed rules, numbers read from the patch's runes), computed in `useBuildPage` and passed to the rune page (`summonerHints`) and the spell picker (`spellEffects`). Neither feature imports the other.
- **Grouped by subject, not by mechanism.** A value effects read lives with what it describes: the current health with the champion state (one per build), the game time with the match state (one per match). The conditions keep only the effects turned on or off.
- **Match state is shared.** One match holds the game time and later its other values (expected gold, dragons). When a second build instance arrives (an opponent, issue 69), both builds read the same match state; the time is never kept per build.
- **Conditions read the other domains.** The composer builds `availableEffects({ patch, champion, ranks, spells, runes })` from the build's patch, the skills, summoner spells and rune page, and injects it into `useConditions` (`available`) and into the stats (`effects: { available, overrides }`). It injects the condition values as plain values too: `useConditions` gets them in its `context` (level, current health, game time) only to show each row's value, and `computeBuildStats` gets `currentHealth` and `gameTime` as inputs. `useChampionState` and `useMatchState` never see the effects: the composer drops a condition value no effect uses when it saves. Until the champion, ranks, spells and runes load, it injects `undefined`, so the link's choices and values stay as given. It also injects the totals the stat-dependent bonuses read (`statBonusBasis`, the same evaluation stopped before that step) and the build's adaptive type (`itemsAdaptiveType`, as the stat shards read it), so each row shows the bonus the stats add.
- **Adding a domain** (as conditions did): a controlled hook in its feature with its rules in `lib/`, its value in `BuildValues` and `buildSearchSchema`, one entry in the composer (inject the data, save its `onChange` with its history entry) and, when it changes stats, one more `computeBuildStats` input.

### Link format

Shared links must keep opening the same build, so the link format has a version: `v=1`. A link without `v` predates versions and is read as v1.

- **Reading** goes through `readBuildSearch` (`features/build-calculator/lib/build-search.ts`), the route's `validateSearch`: it reads `v`, applies the migrations from that version on, in order (`v1 → v2 → …`, `migrateBuildLink` in `build-link-migrations.ts`), then checks the result with `buildSearchSchema`, the current format. **Writing** (`toBuildSearch`) always emits the latest `v`.
- **Recent builds** store each build as its link search (`{ championKey, search }`) and read it back through `readBuildSearch`, so they migrate like links. Entries saved before versions are read as v1.
- **Needs a bump:** renaming or removing a param, or changing what a value means or how it is encoded (the rune page string, the skill letters, item ids). Add one pure migration to `BUILD_LINK_MIGRATIONS` (that raises `BUILD_LINK_VERSION`) and a fixture with a real link from the older version to `src/app/build-link-fixtures.test.ts`, which must keep opening the same build.
- **No bump:** a new optional param (old links simply lack it, and its absence means its default) or a new accepted value of an existing param. Experimental domains can live in a non-URL build source until their format is stable, then join the link.
- **`effects`** holds only the choices that differ from each effect's default, by effect id: `ghost` turns Ghost on, `-teemo-w-passive` turns Move Quick's passive off (`effects=ghost,-teemo-w-passive`, `serializeEffectOverrides` in `lib/effects/effect-overrides.ts`). No choice means no param. A choice for an effect the build no longer has (Ghost swapped for Flash) is dropped on the next edit. It came as a new optional param of v1 (no bump).
- **`hp`** is the current health in percent of maximum health, 1 to 100 (`hp=40`), which health-dependent effects read (Tryndamere's Bloodlust). Full health means no param, and it is dropped on the next edit when no effect of the build reads it, like an `effects` choice. It came as a new optional param of v1 (no bump).
- **`min`** is the game time in whole minutes, 0 to 120 (`min=30`), which time-dependent effects read (Gathering Storm). The game's start (0) means no param, and it is dropped on the next edit when no effect of the build reads it, like `hp`. 120 only guards typos. It came as a new optional param of v1 (no bump).
- **`skills`** holds one letter per level (`Q`, `W`, `E`, `R`), level 1 first, with `_` (`UNSPENT_LEVEL_MARK`, `lib/skill-order-param.ts`) for a level whose point is unspent: `Q_Q` is Q at levels 1 and 3. Levels after the last letter are unspent, so trailing `_` are never written. The `_` came as a new accepted value of v1 (no bump): older links never contain it and read as before.

## Effects

Conditional effects (an ability's passive that holds only while not hit, a summoner spell, a rune that triggers after one) are **typed, sourced data**, never an `if` in the stats code. One evaluator applies them; it knows trigger and grant kinds, never a champion or a spell.

```
lib/effects/
├── effect.ts               Effect, Grant, Trigger, Amount, BuildEffect, EffectOverrides
├── defaults.ts             isOnByDefault and isSwitchable: lookups on the trigger kind
├── current-health.ts       the current health condition: its range, usesCurrentHealth
├── game-time.ts            the game time condition: its range, usesGameTime, nextGameTimeStep
├── evaluate.ts             activeEffects, stackEffects, resolveGrants, effectStatsInput, alwaysOnRankStats
├── stacking.ts             resolveStacking: one pure function for the stacking groups
├── available-effects.ts    availableEffects(build): the effects whose source is in the build
├── effect-overrides.ts     the `effects` link param
└── registries/             one registry per source: ability, summoner, rune, item effects; VERIFIED_ON
```

- **An effect** has an `id` (readable, it goes in links), a `source` (`ability`, `summoner`, `rune`, `item`), `grants` (`stat`, `shield`, `heal`; `damage` waits for the combo timeline) and a `trigger`. It holds for a patch range (`since`, optional `until`). It may also have a `duration`, `cooldown`, `stacks`, `endsOn`, `defaultOn`, a `stacking` group and a `part` (`passive` or `active`, the row label in its ability's card), and it always has a `sourceUrl`.
- **Amounts** are a number or a table read at the build's state:
  - `level`: the summoner spell's synced value by champion level;
  - `rank`: the ability's synced rank stat by its rank, with a `scale`;
  - `rankValue`: the ability's synced tooltip line by its label and rank, with a `scale` (Malphite's W "Armor", 10 to 30 %);
  - `summonerCooldown`: brackets of the spell's cooldown.

  Two kinds read the build beyond the tables:
  - `stat`: a `ratio` (a number or a table) of another stat's total, read before the stat-dependent bonuses (evaluation step 4): Malphite's W is `{ by: "stat", stat: "armor", ratio: <"Armor" line> }`;
  - `missingHealth`: grows from 0 at full health to `max` at `fullAt` percent missing health, read from the current health condition (Tryndamere's Q: 80 bonus AD at 90% missing);
  - `gameTime`: grows once per full `every` minutes of the game time condition. `triangular` growth adds one more `step` each time, `step` × n(n+1)/2 after n steps, with no cap (Gathering Storm: 8, 24, 48, 80 at 10, 20, 30, 40 min).
- **Adaptive Force:** a `stat` grant may give `adaptiveForce` instead of a stat. It becomes ability power or 0.6 attack damage per point by the build's adaptive type, read like the stat shards (`itemsAdaptiveType`: the items' bonus AP against bonus AD, the champion's `adaptiveType` on a tie).

  Numbers come from the synced data whenever it has them. A hand-written number (Nimbus Cloak's brackets, spellblade ratios) cites its page in `sourceUrl` and has a test against it.
- **Defaults come from the trigger.** `always` and `while: <condition>` are on: the stats show a champion at rest. `after-use`, `after-summoner`, `on-hit` and `after-ability` are off. `defaultOn` overrides it as data.
- **Always-on passives inform.** An `always` effect (Malphite's W, Janna's W) has no switch (`isSwitchable`): its row in the Effects list shows what it adds, so a bonus never appears from nowhere, and a link choice for it is ignored and dropped.
- **Condition values** are build state that effects read, kept by the domain of their subject (the current health by the champion state, the game time by the match state) and the link. The **current health** (percent of maximum health, 1 to 100, default 100; link `hp`) is the first: `missingHealth` amounts read it, and every row whose effect reads it carries the `CurrentHealthInput` slider (`usesCurrentHealth`). The combo timeline and later health-dependent effects read the same value.
  The **game time** (whole minutes, 0 to 120, default 0; link `min`) is the second: `gameTime` amounts read it, and every row whose effect reads it carries the `GameTimeInput` (minutes with − and +, presets 10 to 40; `usesGameTime`) and shows the next step ("+24 Ability Power (next: +48 Ability Power at 30 min)"). Every input is the same controlled value, so they stay in sync. Expected gold, item stacks and the expected level by minute will read it too.
- **Which effects a build has:** `availableEffects` keeps:
  - an ability effect whose champion is the build's and whose ability has a rank;
  - a summoner effect whose spell is chosen;
  - a rune effect whose rune is on the page.

  An `after-summoner` effect becomes one effect per chosen spell (`nimbus-cloak-flash`), since its value depends on the spell cast. Item effects are not listed yet (stage 1).
- **Active** = available, filtered by the user's choice or else the default, then resolved by stacking group (`resolveStacking`). Effects without a group add up (Nimbus Cloak and Heal's movement speed sum, then the soft caps apply).
- **Stacking groups** (`stacking: { group, rule, priority? }`); one effect per group applies:

  | Rule | Which effect applies | Example |
  | --- | --- | --- |
  | `replace` | the highest `priority` that is on (required for this rule) | Move Quick's active (priority 1) stands in for its passive (0) |
  | `highest` | the largest value (its grants' values summed) | two sources of the same buff that do not stack |
  | `unique` | the first one, once | a unique item passive held twice |

  The Effects list shows a stacked-out effect that is on dimmed, with its switch disabled and the reason ("Replaced by the active").
- **Patch validity.** Every effect and every hand-written rule (the movement speed soft caps in `MOVEMENT_SPEED_SOFT_CAPS`, Nimbus Cloak's brackets, the stacking groups) has a patch range with the data overrides' convention: `since` and an optional `until`, as `major.minor`, inclusive (`PatchRange` and `isInPatchRange` in `scripts/sync-data/schemas/patch-range.ts`). The build's patch picks the version in force: `availableEffects({ patch, … })` drops effect versions outside it, and `computeBuildStats({ patch, … })` applies that patch's soft caps. So a link pinned to an older patch keeps that patch's rules. Brackets and stacking groups are fields of an effect, so they follow its range.
- **A rank stat an effect reads belongs to that effect.** Teemo's W rank stat is synced like any other, but `alwaysOnRankStats` leaves it to the `teemo-w-passive` effect. On by default, it keeps the old totals. Janna's W rank stat went the same way into `janna-w-passive`, next to its AP part.

### Evaluation order

`computeBuildStats` applies, in order:

1. the champion's base stats at its level and form;
2. items, stat shards and rank stats;
3. the active effects' stats, as one more stat source (they add to the item bonuses);
4. stat-dependent bonuses: the active effects' `stat` amounts, all reading the totals of steps 1 to 3, so no bonus feeds another or itself (Malphite's 30% of armor adds 30% once);
5. the movement speed soft caps (`lib/stats/movement-speed.ts`; wiki "Movement speed");
6. the outputs: shields and heals, from `resolveGrants` per effect. The Effects list shows them on each row, on or off.

### Adding an effect

1. Find its numbers in the synced data (`summoner-spells.json` values, a champion's `rankStats`), or on the wiki or CommunityDragon when the data lacks them.
2. Add one entry to the registry of its source in `lib/effects/registries/`, with a readable `id`, the trigger that decides its default, its `sourceUrl` and `since`: the patch you checked the numbers on (`VERIFIED_ON` for the stage-1 effects). Pick its amount:
   - a per-rank number the tooltip shows: `rankValue` with the line's label (`scale: 0.01` for a percent line);
   - a bonus that is a share of another stat: `stat` with that stat and the `ratio` (a number, or a `rankValue` per rank). It applies in step 4, after the other effects;
   - a value that follows the current health: `missingHealth`. Its row gets the health input by itself;
   - a value that grows with the game time: `gameTime`. Its row gets the game time input and the next step by itself.

   An always-on passive gets the `always` trigger: an informational row without a switch. A new kind of trigger, grant, amount or condition value is a type change plus one case in `defaults.ts` or `evaluate.ts`, never a check on an id. A new condition value also joins the state of its subject (`ChampionStateValue` for the champion, `MatchStateValue` for the match), the link (a new optional param) and the recent builds, like `currentHealth`.
3. Decide how it stacks. By default it adds to every other effect. When the game lets only one of several apply, give them one `stacking.group` with the same rule: `replace` with a `priority` each (the higher one wins while on), `highest` (the largest value wins) or `unique` (applies once). Never compare ids in the evaluator. An ability's effects with a `part` share one card in the Effects list.
4. When a later patch changes it, never edit the entry in place: give the old one an `until` (the last patch it held) and add a new entry with the same `id` and the new `since`. Ranges of one id must not overlap (a registry test checks it). The same goes for the soft caps, a new version in `MOVEMENT_SPEED_SOFT_CAPS`. Checking at sync time whether a rule is stale is a separate issue.
5. Test it in the registry's test file against the page you cited (values at level 1 and 18, or per rank). An amount read from a tooltip line is tested against the current patch's data (`public/data`), so a sync that renames or changes the line fails the tests.
6. Nothing else: the Effects list, the link and the stats pick it up.

### Stage 2: the combo timeline (design)

The combo builder (issue 69) simulates a sequence of actions: basic attacks, Q/W/E/R, summoner spells and waits. It reuses this model unchanged:

- **State:** time, the active effects with their end times, marks on the target, cooldowns and stacks.
- **Events:** each action emits events (`on-cast`, `on-hit`, `after-ability`, `after-summoner`, `target-marked`, `mark-consumed`). An effect whose trigger matches an event starts with its `duration`. An effect with `endsOn` stops when its event happens. `cooldown` and `stacks` gate it.
- **Each step's stats** are `computeBuildStats` with the effects active at that moment. Active comes from the event history instead of the switches; it is the same evaluator.
- **Damage** grants (spellblade, already registered) resolve their `ratios` against that step's stats.
- New trigger kinds (`on-cast`, `target-marked`, `mark-consumed`) and the simulator, another pure function, are the only additions.

## Where does new code go

| What | One feature | 2+ features | Generic, no domain |
| --- | --- | --- | --- |
| Component | `features/<f>/components/` | `components/common/` | `components/ui/` |
| Animation | `<name>.motion.tsx` next to the component | `<name>.motion.tsx` | `components/motion/` |
| Hook | `features/<f>/hooks/` | `hooks/` | `hooks/` |
| Pure logic | `features/<f>/lib/` | `lib/` | `lib/` |
| Game data fetch / hook | `data/` | `data/` | `data/` |
| Other IO (storage, URL) | `features/<f>/services/` | `lib/` | `lib/` |
| Types | `features/<f>/types/` | `types/` | `types/` |
| Page: its screens and page-level hooks | `pages/<page>/` | | |
| Route (path, search, loader, head, fallbacks) | `routes/` | | |
| Provider, app config | `app/` (feature-scoped providers stay in the feature) | | |

**Promotion rule:** start in the most specific place. When a second feature needs the code, move it to the matching shared layer (`components/common`, `hooks`, `lib`, `types`) in the same PR. Never import it across features instead, and never create shared code for a single consumer.

## Migration map

Moved in #96, #42, #41 and #40 (SCSS to Tailwind utilities and `components/ui`). Nothing is pending.
