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
│   └── champion-build/   the build page: picks the screen (overview, expanded shop, expanded combo, mobile), useChampionBuild, useBuildPage
├── features/             feature slices, never import each other
│   ├── champions/        champion grid, search, champion header and skills, the champion picker; champion state (level, form, current health)
│   ├── build-calculator/ level, item slots, stats panel (on top of lib/stats)
│   ├── item-shop/        item grid, role/stat filters, sorting, tooltips
│   ├── runes/            rune page editor (trees, runes, stat shards) and its summary card
│   ├── skills/           skill points: rank rules, suggested order and history, the skills row and Skills tab
│   ├── summoners/        the two summoner spell slots: picks, swap, checks against the patch's spells
│   ├── match/            the match state (useMatchState): the game time, one per match, and the build's match stacks
│   ├── conditions/       the conditional effects turned on or off (useConditions) and the Effects list
│   ├── target/           the combo's target, a dummy with presets (useTarget, TargetEditor)
│   └── combat/           the combo: its steps (useCombat, kept in the link), keys, step cards and totals
├── data/                 game data loading: fetch + Zod parsing, data hooks, query options
│   ├── services/         fetchGameData, fetchManifest, fetchChampion, fetchItems
│   ├── queries/          queryOptions() factories (gameDataQueries)
│   └── hooks/            use-current-patch.ts, use-champions.ts, use-champion.ts, use-items.ts, use-runes.ts, use-summoner-spells.ts
├── components/
│   ├── ui/               primitives with no domain knowledge: button, slider, tooltip
│   ├── motion/           generic motion primitives (Collapse, Stagger) and motion tokens
│   └── common/           shared app UI: header, logo, app name
├── lib/                  pure, React-free code: stats engine, effect model (lib/effects), combat simulator (lib/combat), cn(), formatters, analytics (track, flags)
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
│   ├── use-build-combat.ts       the combo (target, steps and markers, free mode) on the composer's combo values and combat input
│   ├── use-champion-switch.ts    the switch to another champion and its notice (issue 354)
│   └── use-build-page.ts         useChampionBuild + view, tab, item selection, previews, form switch, the combo, the champion switch
└── lib/
    ├── condition-values.ts       dropUnusedConditionValues: the composer's cleanup on save
    └── champion-switch.ts        switchChampionValues: what a champion switch keeps and resets
```

| Domain | Hook | Feature | Value in the source |
| --- | --- | --- | --- |
| Champion state | `useChampionState` (level, form, current health) | `champions` | `level`, `form`, `currentHealth` |
| Skills | `useSkills` (ranks, order, kept points) | `skills` | `skills` |
| Items | `useBuildItems` (chosen items, full-build notice, announcement, item events) | `build-calculator` | `itemIds` |
| Rune page | `useRunePage` (checked page, stat shards) | `runes` | `runes` |
| Summoner spells | `useSummoners` (the two slots, pick, swap, clear) | `summoners` | `summoners` |
| Match state | `useMatchState` (game time, match stacks) | `match` | `gameTime`, `matchStacks` |
| Conditions | `useConditions` (the effects turned on or off, with their values) | `conditions` | `effects` |
| Target | `useTarget` (the combo's dummy: health, armor, magic resist) | `target` | `target` |
| Combo | `useCombat` (the combo's steps and situation markers, free mode and its choices, simulated on the build) | `combat` | `combo`, `free`, `choices` |

Each rule about a value lives in one place:

| Rule | Where |
| --- | --- |
| The value, its default and its setter (`currentHealth` is 100 and `gameTime` is 0 when absent; a setter saves the number as picked) | the domain hook (`useChampionState`, `useMatchState`) |
| A default stays out of the link (`hp` at 100, `min` at 0, like level 1 or no items) | the link writer, `toBuildSearch` |
| A condition value that no available effect uses is dropped (as given while the effects load) | the composer, `dropUnusedConditionValues` on every save |

- **Controlled domain hooks.** Each takes `value` + `onChange` and gets its data injected (champion, items, runes). It knows nothing about the URL, the browser history or the other domains, and keeps the given value while its data loads. Its rules live in the feature's `lib/` as pure functions with unit tests (`readRunePage`, `readBuildItems`, `readChampionState`, `readSummoners`); the hook stays thin and is covered by the e2e flows.
- **One build source.** `BuildSource` = `{ state, update(patch, navigation) }` (`features/build-calculator/types/build-source.ts`). `useUrlBuildSource` is the only place that writes the URL search (with `toBuildSearch`) and records recent builds; it also carries the page's view and tab, which are never recorded. A later source per build instance (an opponent, a comparison) plugs into the same composer.
- **The composer.** `useChampionBuild({ patch, championKey, source })` reads the game data, injects it, and saves each domain's change together with the checked values of every domain, so an edit still cleans a link's unknown items or invalid runes. It holds the explicit browser-history table (items push, so Back undoes them; champion state, skills, runes, summoner spells, the target and the combo's edits replace, except an edit that empties the combo, Clear or its last entry removed, which pushes so Back brings it back) and the cross-domain links (a level change also saves the skill points that level keeps or restores; the skills' ranks go to the champion state, which unlocks the forms that need a point).
- **Pure stats.** `computeBuildStats({ champion, patch, level, form, items, shards, ranks, effects })` (`lib/stats/`). Every "what if" is `whatIf(change)`: a shop item preview (`items`), the other form (`form`), the next rank (`ranks`), the stats without runes (`shards: []`), an effect turned on (`effects`; see [Effects](#effects)).
- **Grouped by domain.** The build reads `build.championState.level`, `build.skills.ranks`, `build.items.add`, `build.runePage.selection`. Page screens (overview, expanded shop, expanded combo, mobile) receive the page object from `useBuildPage`; feature components receive props, never the whole build.
- **Hints between domains** are page wiring too: the runes that react to the chosen summoner spells come from `lib/summoner-rune-interactions.ts` (typed rules, numbers read from the patch's runes), computed in `useBuildPage` and passed to the rune page (`summonerHints`) and the spell picker (`spellEffects`). Neither feature imports the other.
- **Grouped by subject, not by mechanism.** A value effects read lives with what it describes: the current health with the champion state (one per build), the game time with the match state (one per match). The conditions keep only the effects turned on or off.
- **Match state is shared.** One match holds the game time and later its other values (expected gold, dragons). When a second build instance arrives (an opponent, issue 69), both builds read the same match state; the time is never kept per build.
- **Conditions read the other domains.** The composer builds `availableEffects({ patch, champion, ranks, spells, runes })` from the build's patch, the skills, summoner spells and rune page, and injects it into `useConditions` (`available`) and into the stats (`effects: { available, overrides }`). It injects the condition values as plain values too: `useConditions` gets them in its `context` (level, current health, game time, the selected form) only to show each row's value, and `computeBuildStats` gets `currentHealth` and `gameTime` as inputs. `useChampionState` and `useMatchState` never see the effects: the composer drops a condition value no effect uses when it saves. Until the champion, ranks, spells and runes load, it injects `undefined`, so the link's choices and values stay as given. It also injects the totals the stat-dependent bonuses read (`statBonusBasis`, the same evaluation stopped before that step) and the build's adaptive type (`itemsAdaptiveType`, as the stat shards read it), so each row shows the bonus the stats add.
- **The combo is in the link (issue 317).** The composer reads the combo's values from the source like any domain's (`combo`, `free`, `choices`, `target`, as link values) and saves their edits with their history entry. `useBuildCombat` (page layer) turns them into the target (`readTargetParam`, `toTargetParam`) and the combo (`useCombatLink`: `CombatState`, steps and markers, free mode, its choices) and injects the composer's `combat` input: the build and match state, `combatEffects` (items' included) and the summoner slots. The effect switches never reach it (issue 265, decision 7). `useCombatLink` gives back the very state of the last edit while the link holds it (before or after it: the URL lags a render), so entry ids and identity survive; another link is read with ids from 1. Which groups are open stays in memory.
- **Switching the champion (issue 354).** The avatar opens the champion picker (`features/champions`: a popover on desktop, a bottom sheet on phones; the home page's `filterChampions`). `switchChampionValues` keeps the items, runes, summoner spells, level, current health and match state, and drops the form, skill points, ability effect choices and the combo with its free mode, choices and target, listing only the resets that changed something. `useUrlBuildSource.switchChampion` opens the new champion's link as a new history entry (Back returns), keeping the patch, view and tab, records it in the recent builds, and puts that summary in the entry's history state; the notice shows it until dismissed or the next edit (a new entry without it), and Undo is Back.
- **Adding a domain** (as conditions did): a controlled hook in its feature with its rules in `lib/`, its value in `BuildValues` and `buildSearchSchema`, one entry in the composer (inject the data, save its `onChange` with its history entry) and, when it changes stats, one more `computeBuildStats` input.

### Link format

Shared links must keep opening the same build, so the link format has a version: `v=1`. A link without `v` predates versions and is read as v1.

- **Reading** goes through `readBuildSearch` (`features/build-calculator/lib/build-search.ts`), the route's `validateSearch`: it reads `v`, applies the migrations from that version on, in order (`v1 → v2 → …`, `migrateBuildLink` in `build-link-migrations.ts`), then checks the result with `buildSearchSchema`, the current format. **Writing** (`toBuildSearch`) always emits the latest `v`.
- **Recent builds** store each build as its link search (`{ championKey, search }`) and read it back through `readBuildSearch`, so they migrate like links. Entries saved before versions are read as v1.
- **Needs a bump:** renaming or removing a param, or changing what a value means or how it is encoded (the rune page string, the skill letters, item ids). Add one pure migration to `BUILD_LINK_MIGRATIONS` (that raises `BUILD_LINK_VERSION`) and a fixture with a real link from the older version to `src/app/build-link-fixtures.test.ts`, which must keep opening the same build.
- **No bump:** a new optional param (old links simply lack it, and its absence means its default) or a new accepted value of an existing param. Experimental domains can live in a non-URL build source until their format is stable, then join the link.
- **`effects`** holds only the choices that differ from each effect's default, by effect id: `ghost` turns Ghost on, `-teemo-w-passive` turns Move Quick's passive off (`effects=ghost,-teemo-w-passive`, `serializeEffectOverrides` in `lib/effects/effect-overrides.ts`). No choice means no param. A choice for an effect the build no longer has (Ghost swapped for Flash) is dropped on the next edit. It came as a new optional param of v1 (no bump).
- **`hp`** is the current health in percent of maximum health, 1 to 100 (`hp=40`), which health-dependent effects read (Tryndamere's Bloodlust). Full health means no param, and it is dropped on the next edit when no effect of the build reads it, like an `effects` choice. It came as a new optional param of v1 (no bump).
- **`stacks`** holds the match stacks by source (issue 400), `<source id>-<count>` with `.` between sources, 1 to 9999 each (`stacks=siphoning-strike-250.phenomenal-evil-80`, `serializeMatchStacks` in `lib/effects/match-stacks.ts`). No stacks means no param, and a source no effect of the build reads is dropped on the next edit, like `min`; a champion switch drops the champion's own. It came with **v2**: v1 kept Siphoning Strike's stacks on each Q step (`q-250`), so `migrateQStacksToBuild` reads the first Q step's count as `stacks` when the link has none and drops the count from every Q step.
- **`min`** is the game time in whole minutes, 0 to 120 (`min=30`), which time-dependent effects read (Gathering Storm). The game's start (0) means no param, and it is dropped on the next edit when no effect of the build reads it, like `hp`. 120 only guards typos. It came as a new optional param of v1 (no bump).
- **`form`** is the selected form's id (`form=mega`); the default form means no param. An id the champion lacks, or a form whose ability rank is missing (`form=dragon` before Shyvana learns R), opens in the default form and is dropped on the next edit. New forms (`dragon`, `rockets`, `true-form`) are new accepted values of v1 (no bump).
- **`view`** is the page layout: `shop` or `combo`, the expanded screens (the overview means no param). It is page state, never recorded in recent builds; `combo` came as a new accepted value of v1 (no bump).
- **`tab`** is the open center tab: `runes`, `skills` or `combo` (the items tab means no param). It is page state, never recorded in recent builds; `combo` came as a new accepted value of v1 (no bump).
- **`combo`**, **`free`**, **`choices`** and **`target`** hold the Combo tab (issue 317): its entries in order, free mode, free mode's answers and the target. They came as new optional params of v1 (no bump): an older link has no combo, and an empty combo in strict mode on the Dummy writes none of them. Recent builds store them; which groups are open does not. The schema reads each token on its own (`lib/combat/combo-link.ts`) and drops the ones it can't read, so `combo=aa.zz.q` opens as `aa.q`; past 30 entries (`MAX_COMBAT_STEPS`) the rest are dropped. What the build decides is checked later, as for `form`: a marker for an effect the build lacks shows "not in this build", an unknown variant lands as the default one, an unknown preset is the Dummy, numbers are brought into the target's ranges.

  | Param | Token | Meaning |
  | --- | --- | --- |
  | `combo` (`.` between entries) | `aa` | a basic attack |
  | | `q` `w` `e` `r`, `q-<variant>` | an ability of the selected form, with its variant's id (`q-handle`, `q-2s`: 2 s in Poison Trail); no variant is the default one, and picking the default writes none (`r` is Pyroclasm's 3 hits, `r-1` and `r-2` the others) |
  | | `d` `f` | the summoner spell in D or F |
  | | `t<seconds>` | a wait, `_` as the decimal point (`t1`, `t0_25`, `t1_5`) |
  | | `m-<effect id>` | a situation marker (`m-hail-of-blades`) |
  | `free` | `1` | free mode on; absent is strict |
  | `choices` (`.` between answers) | `<position><outcome>-<id>-<y\|n>` | an answer at the entry at that position in `combo` (1 first, markers count); outcome `e` empowered (effect id), `a` mark applied (mark), `c` mark consumed (mark), `d` damage over time applied (effect id): `2e-hail-of-blades-n` |
  | `target` | `<preset id>` or `<health>-<armor>-<magic resist>` | a preset other than the Dummy (`tank`) or the numbers (`2500-60-45`) |

  A choice stays in the link while free mode is off, like in the tab. Only `-`, `.` and `_` separate tokens, the characters a URL keeps as they are, so the link reads as written. A 30-entry combo with two markers and 32 answers measured 925 characters for the whole URL.
- **`skills`** holds one letter per level (`Q`, `W`, `E`, `R`), level 1 first, with `_` (`UNSPENT_LEVEL_MARK`, `lib/skill-order-param.ts`) for a level whose point is unspent: `Q_Q` is Q at levels 1 and 3. Levels after the last letter are unspent, so trailing `_` are never written. The `_` came as a new accepted value of v1 (no bump): older links never contain it and read as before.

## Effects

Conditional effects (an ability's passive that holds only while not hit, a summoner spell, a rune that triggers after one) are **typed, sourced data**, never an `if` in the stats code. One evaluator applies them; it knows trigger and grant kinds, never a champion or a spell.

```
lib/effects/
├── effect.ts               Effect, Grant, Trigger, Amount, BuildEffect, EffectOverrides
├── boosts.ts               boostSlots and effectBoosts: the other abilities a `rankValue` with a `slot` reads
├── defaults.ts             isOnByDefault and isSwitchable: lookups on the trigger kind
├── current-health.ts       the current health condition: its range, usesCurrentHealth
├── game-time.ts            the game time condition: its range, usesGameTime, nextGameTimeStep
├── match-stacks.ts         the match stacks: their range, matchStackSources, usedMatchStacks, the `stacks` link param
├── evaluate.ts             activeEffects, stackEffects, resolveGrants, effectStatsInput, alwaysOnRankStats
├── stacking.ts             resolveStacking: one pure function for the stacking groups
├── available-effects.ts    combatEffects(build): the effects whose source is in the build; availableEffects: those the panel lists
├── effect-overrides.ts     the `effects` link param
└── registries/             one registry per source: ability, summoner, rune, item effects; VERIFIED_ON

lib/champions/
├── <champion>.ts           one champion's ability effects and combo hit rules (see below)
└── rule-helpers.ts         WIKI, percentLine
```

- **An effect** has an `id` (readable, it goes in links), a `source` (`ability`, its slot or `passive`; `summoner`, `rune`, `item`), `grants` (`stat`, `attackSpeedMultiplier`, `shield`, `heal`, and the grants only the [combat simulator](#combat) reads: the damage ones, `damage`, `abilityDamage`, `damageOverTime`, `onAttackDamage`, and `resistReduction`, the target's armor or magic resist lowered, `flat` or `percent`, by an effect it holds) and a `trigger`. It holds for a patch range (`since`, optional `until`). It may also have a `duration`, a `delay`, `cooldown`, `stacks` (with `onlyAtMax`, its grants hold only at full stacks: Vi's attack speed after the third hit), `endsOn`, `defaultOn`, `listed` (a combat trigger's effect that gets a switch in the stats panel too: Heightened Senses), a `stacking` group, a `part` (`passive` or `active`, the row label in its ability's card), a `form` (it holds only in that form; see [Forms](#forms)), a `label` (its row's name when neither the part nor the form says it: "Rev'd up"), the mark it `applies` and its `holder` (the target, for Ignite's burn), and it always has a `sourceUrl`. The combat simulator also reads `cooldownFrom` (`mark-end`: the cooldown starts when its mark leaves the target; `end`: when the effect ends, its charges used or its duration over), `charges` (the basic attacks it holds for: an `on-attack` one's include the attack that triggers it; an `after-use` or `after-ability` one counts the attacks after it, Bladework's 2, and a re-trigger gives them back, Monk Training), `pauses` (part of it switched off for a while after an event, the rest holding; see [What a hit does](#what-a-hit-does)), `startsAfter` (a state it waits in before it runs, which an event breaks, drops (`dropsOn`) or which runs out: Ambush's camouflage), `reducedOnCast` (seconds each ability cast takes off its cooldown), `resets` (another effect's stacks it sets when it takes effect and caps while it runs: Blaze's detonation) and `start`, the situation a combo marker can set with it (see [Combat](#combat)).
- **Amounts** are a number or a table read at the build's state:
  - `level`: the summoner spell's synced value by champion level;
  - `rank`: the ability's synced rank stat by its rank, with a `scale`;
  - `rankValue`: the ability's synced tooltip line by its label and rank, with a `scale` (Malphite's W "Armor", 10 to 30 %). With a `slot`, another ability's line at that ability's rank, and `unranked` while it has no point (Mini Gnar's Hyper: 20%, then GNAR!'s "Hyper Move Speed", 40 / 60 / 80% by R rank). The row names the boost ("+60% Move Speed · boosted by GNAR! (R2)", `effectBoosts` in `boosts.ts`);
  - `summonerCooldown`: brackets of the spell's cooldown;
  - `championLevel`: steps by champion level, each from its `from` level on (Jayce's Hammer Stance: 5, 12, 19, 26 from levels 1, 6, 11, 16).

  Two kinds read the build beyond the tables:
  - `stat`: a `ratio` (a number or a table) of another stat's total, read before the stat-dependent bonuses (evaluation step 4): Malphite's W is `{ by: "stat", stat: "armor", ratio: <"Armor" line> }`. With `part: "bonus"` it reads only the stat's bonus (Jayce's 7.5% bonus AD, Bel'Veth's 150% bonus AD). A `missingHealth` ratio makes it a share of missing health (Olaf's Tough It Out shield: 17.5% of missing health, counted up to 70% missing, is `ratio: { by: "missingHealth", max: 0.175 × 0.7, fullAt: 70 }` of `health`);
  - `missingHealth`: grows from 0 at full health to `max` at `fullAt` percent missing health, read from the current health condition (Tryndamere's Q: 80 bonus AD at 90% missing);
  - `matchStacks`: `ratio` (1 by default) per stack of its `source`, a count the build sets (issue 400: Phenomenal Evil's 1 AP per stack). The source (`MatchStackSource`: `id` for the link, `name` for the input, `sliderMax`: where its slider ends, a typical late-game count) is declared once in its champion's file;
  - `gameTime`: grows once per full `every` minutes of the game time condition. `triangular` growth adds one more `step` each time, `step` × n(n+1)/2 after n steps, with no cap (Gathering Storm: 8, 24, 48, 80 at 10, 20, 30, 40 min);
  - `statDecay`: `base` × `factor` ^ (a stat's total ÷ `per`), read from the totals like `stat` (Harrier's cooldown: 7 × 0.99 per 1% critical strike chance, 7 s down to 2.56 s);
  - `attackType`: one table for melee and one for ranged, read at the champion's attack type in its form and at its level (Hail of Blades: 90% and 60% bonus attack speed).
- **Attack speed multipliers:** an `attackSpeedMultiplier` grant scales the attack speed instead of adding to it, `of: "bonus"` its bonus part (Jinx's Rockets keep 90%: `-0.1`) or `of: "total"` the whole (Bel'Veth's True Form: +6 to 20%). They apply in their own step, after every bonus.
- **Adaptive Force:** a `stat` grant may give `adaptiveForce` instead of a stat. It becomes ability power or 0.6 attack damage per point by the build's adaptive type, read like the stat shards (`itemsAdaptiveType`: the items' bonus AP against bonus AD, the champion's `adaptiveType` on a tie).

  Numbers come from the synced data whenever it has them. A hand-written number (Nimbus Cloak's brackets, spellblade ratios) cites its page in `sourceUrl` and has a test against it.
- **Defaults come from the trigger.** `always` and `while: <condition>` are on: the stats show a champion at rest. `after-use`, `after-summoner`, `on-hit`, `after-ability` and the combat triggers `on-attack`, `on-cast`, `on-mark-consumed`, `periodic`, `on-ability-damage`, `on-damage` and `on-max-stacks` are off. `defaultOn` overrides it as data.
- **Always-on passives inform.** An `always` effect (Malphite's W, Janna's W) has no switch (`isSwitchable`): its row in the Effects list shows what it adds, so a bonus never appears from nowhere, and a link choice for it is ignored and dropped.
- **Condition values** are build state that effects read, kept by the domain of their subject (the current health by the champion state, the game time by the match state) and the link. The **current health** (percent of maximum health, 1 to 100, default 100; link `hp`) is the first: `missingHealth` amounts read it, and every row whose effect reads it carries the `CurrentHealthInput` slider (`usesCurrentHealth`). The combat simulator passes it to the stats too, and later health-dependent effects read the same value.
  The **game time** (whole minutes, 0 to 120, default 0; link `min`) is the second: `gameTime` amounts read it, and every row whose effect reads it carries the `GameTimeInput` (minutes with − and +, presets 10 to 40; `usesGameTime`) and shows the next step ("+24 Ability Power (next: +48 Ability Power at 30 min)"). Every input is the same controlled value, so they stay in sync. Expected gold and the expected level by minute will read it too.
  The **match stacks** (issue 400; whole stacks, 0 to 9999 per source, default 0; link `stacks`) are the third: permanent stacks gathered over a match (Siphoning Strike's, Phenomenal Evil's), a deliberate build choice and not tied to the game time, since they follow kills, not minutes. `matchStacks` amounts read them, and every row whose effect reads a source carries that source's `MatchStacksInput` (a slider from 0 to the source's `sliderMax`, at its end for a larger count, and a box with − and + that takes any count up to 9999; `matchStackSources`) and says "Stacks gained over the match". They live with the match state but belong to the build (a second build in the match keeps its own). Stacks a combo gains are not modeled.
- **Counters:** a synced damage formula's `counter` part (Siphoning Strike's `stacks`, issue 397) reads the `counter` grants of the effects whose source is that ability (`abilityCounters`): `nasus-q-stacks` gives Q's `stacks` its match stacks. The combat simulator reads them from the effects running on the attacker, and the Skills tab from the build's active effects (`buildAbilityCounters`); a formula whose counter nothing gives has no number. The Skills tab shows each ranked ability's first synced damage at the build's stats ("Damage with this build", before resistances; none for a share of the target's health).
- **Which effects a build has:** `availableEffects` keeps:
  - an ability effect whose champion is the build's and whose ability has a rank;
  - a summoner effect whose spell is chosen;
  - a rune effect whose rune is on the page.

  An `after-summoner` effect becomes one effect per chosen spell (`nimbus-cloak-flash`), since its value depends on the spell cast. That is `combatEffects`; the stats panel's `availableEffects` leaves out the items' effects (none on screen yet) and those `isListed` rejects: the combat triggers (`on-attack`, `on-cast`, `on-mark-consumed`, `periodic`, `on-ability-damage`, `on-damage`, `on-max-stacks`) and effects the target holds.
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

1. the champion's base stats at its level and form (a form missing its required rank is the default);
2. items, stat shards and rank stats;
3. the active effects' stats, as one more stat source (they add to the item bonuses); an effect bound to a form is active only in it;
4. stat-dependent bonuses: the active effects' `stat` amounts, all reading the totals of steps 1 to 3, so no bonus feeds another or itself (Malphite's 30% of armor adds 30% once);
5. attack speed multipliers (`attackSpeedMultipliers`, `multiplyAttackSpeed` in `lib/stats/attack-speed.ts`): the bonus ones scale the bonus part, then the total ones the whole. No stat-dependent bonus reads a multiplied attack speed;
6. the movement speed soft caps (`lib/stats/movement-speed.ts`; wiki "Movement speed");
7. the outputs: shields and heals, from `resolveGrants` per effect. The Effects list shows them on each row, on or off.

### Where to find a champion's rules

Everything specific to one champion lives in two files named after it (the champion key in kebab-case: `teemo.ts`, `dr-mundo.ts`), each opening with a short list of its quirks (keep it current when a rule changes):

- `src/lib/champions/<champion>.ts`, the app: its ability effects (`TEEMO_EFFECTS`) and how its casts hit in the combo (`TEEMO_HIT_RULES`), each checked with `satisfies`.
- `scripts/sync-data/champions/<champion>.ts`, the sync, which runs first: its data fixes, level states, forms, form abilities, skill rules, cast times and rank stats, each export named after its override id (`GNAR_FORMS` is `gnar-forms`). README, Data overrides.

Only champions with rules have a file. `ABILITY_EFFECTS`, `ABILITY_HIT_RULES` and the sync's tables (`CHAMPION_OVERRIDES` and its parts, `FORM_ABILITY_RULES`, `RANK_STAT_RULES`) are explicit import lists of those exports, alphabetical by champion (no barrels); the engines read only the rules' general properties, never a champion id.

### Adding an effect

1. Find its numbers in the synced data (`summoner-spells.json` values, a champion's `rankStats`), or on the wiki or CommunityDragon when the data lacks them.
2. Add one entry to its source's list: an ability's effect in its champion's file, `lib/champions/<champion>.ts` (the champion's first rule creates the file and adds its export to `ABILITY_EFFECTS`), any other in its registry in `lib/effects/registries/`. Give it a readable `id`, the trigger that decides its default, its `sourceUrl` and `since`: the patch you checked the numbers on (`VERIFIED_ON` for the stage-1 effects). Pick its amount:
   - a per-rank number the tooltip shows: `rankValue` with the line's label (`scale: 0.01` for a percent line);
   - a basic ability's bonus that its ultimate (or any other ability) upgrades by rank: one effect in the basic ability's slot, with `rankValue` naming the upgrading `slot` and its `unranked` value (Hyper reads GNAR!'s line). Reusable for any such pair, never two rows;
   - a bonus that is a share of another stat: `stat` with that stat and the `ratio` (a number, or a `rankValue` per rank). It applies in step 4, after the other effects;
   - a value that follows the current health: `missingHealth`. Its row gets the health input by itself;
   - a value that grows with the game time: `gameTime`. Its row gets the game time input and the next step by itself;
   - a value per permanent stack gathered over the match: `matchStacks` with its `MatchStackSource` (a damage formula's `counter` reads it through a `counter` grant). Its row gets the source's stacks input by itself;
   - a value that steps up with the champion level: `championLevel` with its `steps`;
   - a share of a stat's bonus only: `stat` with `part: "bonus"`;
   - a multiplier of the attack speed: an `attackSpeedMultiplier` grant, `of: "bonus"` or `of: "total"`.

   A bonus that holds only in one form gets `form` with the form's id: it applies, and its row shows, only while the champion is in that form (see [Forms](#forms)).

   An ability's buff after casting it (Udyr's stances, Viego's E, Rengar's R, Master Yi's R) gets the `after-use` trigger and its `duration`: a switch, off by default. One that holds for a number of attacks gets `charges` too (Fiora's Bladework: 2 attacks within 4 s); one after any ability gets `after-ability` (Udyr's Monk Training). One that procs after hits gets `on-hit` with its `stacks` (Mini Gnar's Hyper after 3 hits), and `onlyAtMax` when nothing holds before the last hit (Vi's Denting Blows). A combat-only effect the panel should switch too gets `listed: true` (Heightened Senses), so it is defined once. A shield made of parts (a base plus ratios, Udyr's Iron Mantle) is one `shield` grant per part; its row shows their sum. A grant that ends before its effect gets its own `duration` (Olaf's Tough It Out: attack speed for 5 s, its shield parts 2.5 s), and one that shrinks gets `decay` (`over` seconds, its duration by default, else its effect's; `to` its floor, 0 by default: Overdrive's movement speed to 10% over 2.9 s). The switch stays one per ability part; the row says each grant's duration when they differ ("+80% Attack Speed for 5 s · 282 shield for 2.5 s", "+70% Move Speed decaying over 1.5 s") and shows a decaying grant at its peak. A buff that starts only when a state the cast enters ends (Twitch's Ambush: camouflaged 1 s after the cast, its attack speed from when an attack or a cast of W or E breaks the camouflage, or it runs out) gets `delay` for the wait before the state and `startsAfter` for the state (`label`, its `duration`, the `endsOn` events that break it, and `ending`, the row's "For 6 s after camouflage breaks"); it keeps one switch, its values as once the state is over.

   An always-on passive gets the `always` trigger: an informational row without a switch. An effect only a combo fires (a mark, what consuming it does, a spellblade) gets a combat trigger or damage grant; see [Combat](#combat). A debuff that lowers the target's armor or magic resist is an effect the target holds (`holder: "target"`) with a `resistReduction` grant, its value at full stacks (Black Cleaver's Carve: 30% over 5 stacks). A new kind of trigger, grant, amount or condition value is a type change plus one case in `defaults.ts` or `evaluate.ts`, never a check on an id. A new condition value also joins the state of its subject (`ChampionStateValue` for the champion, `MatchStateValue` for the match), the link (a new optional param) and the recent builds, like `currentHealth`.
3. Decide how it stacks. By default it adds to every other effect. When the game lets only one of several apply, give them one `stacking.group` with the same rule: `replace` with a `priority` each (the higher one wins while on), `highest` (the largest value wins) or `unique` (applies once). Never compare ids in the evaluator. An ability's effects with a `part` share one card in the Effects list.
4. When a later patch changes it, never edit the entry in place: give the old one an `until` (the last patch it held) and add a new entry with the same `id` and the new `since`. Ranges of one id must not overlap (a registry test checks it). The same goes for the soft caps, a new version in `MOVEMENT_SPEED_SOFT_CAPS`. Checking at sync time whether a rule is stale is a separate issue.
5. Test it in the registry's test file against the page you cited (values at level 1 and 18, or per rank). An amount read from a tooltip line is tested against the current patch's data (`public/data`), so a sync that renames or changes the line fails the tests.
6. Nothing else: the Effects list, the link and the stats pick it up.

### Forms

A champion's forms (Mini and Mega Gnar, Shyvana's Dragon, Jinx's Rockets) are a hybrid of data and effects:

- **The form keeps its fixed part**, curated in the champion's sync file, `scripts/sync-data/champions/<champion>.ts` (README, Data overrides): attack type, the growth stats it replaces, its level states. `formStats` applies it in evaluation step 1.
- **What varies is an effect bound to the form**, in the champion's effects (`lib/champions/<champion>.ts`): a bonus by ability rank (Shyvana's Dragon health), by champion level (Jayce's Hammer resistances) or by another stat (Bel'Veth's 150% bonus AD as health) is an effect with `form: "<form id>"`. `computeBuildStats` puts the selected form in the effects' context, and `activeEffects` keeps a form-bound effect only in its form, so `whatIf({ form })` and the form's delta chips include it with no form code. Its row in the Effects list shows only while the form is selected, under the form's name; an `always` one is an informational row ("While in this form").
- **A form may need an ability point:** `requires: { slot, minRank }`. Until the skills reach it, `selectedForm` falls back to the default form (stats, champion state and link), the toggle keeps the form visible but disabled with the reason (`formLocks`: "Learn R to unlock Dragon"), and the form is not compared. While the ranks load, nothing is locked.
- **A form shows its own abilities** (Cannon Jayce's Shock Blast, Cougar Nidalee's Takedown) or its own look of the ones it keeps (Jinx's Pow-Pow and Fishbones Q, Jayce's cannon passive icon): the synced `abilities.forms.<form id>` holds them by slot, passive included (README, Game data). The composer derives `abilities` with `abilitiesInForm` (`lib/form-abilities.ts`) for the selected form, and the page passes them to the skills row and the Skills tab, so the names, icons, rank-up tooltips and per-rank tables follow the form while the skills feature knows nothing of forms. Ranks, the skill order and the `skills` link stay per slot. An effect bound to a form reads that form's ability in its slot (`spellInForm`: its row's name and `rankValue` lines); an unbound one reads the default form's. An ability the form can't cast (Mini Gnar's GNAR!, dismounted Kled's W, E and R) carries `unavailable.reason`: the skills row, its tooltip and the Skills tab card say it (icon, text and accessible description, not color only), and its points stay spendable and counted per slot. The combat simulator reads the same flag to refuse the cast ([Combat](#combat)).
- **Dependencies are injected:** the composer passes the skills' ranks to `useChampionState` and the selected form to `useConditions`; no feature imports another.

**Adding a form:** a `defineForms` export in the champion's sync file, listed in `CHAMPION_FORMS` (its `id` is the link value; the first form is the default, with only names), `requires` when it needs a point, then one effect per varying bonus with `form` set in the champion's app file, its numbers from the synced tooltip lines where they exist (`rankValue`) or the wiki (`sourceUrl`), tested at a few ranks and levels against the current patch data (`ability-effects.test.ts`). A registry test checks that every form-bound effect names a form its champion has.

## Combat

The combo simulator (issue 265, stage 2) runs a sequence of actions against a target that doesn't react and reports the damage, the time to kill and the effects running at each step. It is one pure function, `simulateCombat`, and reuses the effect model unchanged: the same registries, evaluator, stacking groups and patch ranges.

```
lib/combat/
├── combat.ts               CombatAction, CombatTarget, CombatEvent, CombatStep, CombatResult, MAX_COMBAT_STEPS
├── combo-link.ts           the `combo` and `choices` link values (read, serialize, drop unreadable tokens), the `target` shape
├── simulate-combat.ts      simulateCombat({ build, effects, summoners, target, actions, free? }, { hitRules }), simulateFreeCombat
├── attack-windup.ts        attackWindupTime: the synced windup at an attack speed (wiki formula, never longer than the attack)
├── damage-formula.ts       evaluateDamage (a synced DamageFormula at the rank, level, stats and target health), abilityCooldown
├── damage-over-time.ts     tick times, which application owns a tick (tickOwner), each step's damageOverTimeSummaries
├── area-ticks.ts           isCastOwnEffect, areaVariants: each time-in-area variant with its ticks (`ticksInArea`)
├── mitigation.ts           effectiveResist, damageMultiplier, mitigate (with the target's reductions), reducedResists
├── curated-champions.ts    CURATED_COMBAT_CHAMPIONS: the champions v1 supports
├── start-options.ts        combatStartOptions: the situations the build's effects support, which markers set
├── outcomes.ts             outcomeId and readOutcomeId, outcomeKeys (the outcomes a step can have, from triggers), outcomeChoices
└── registries/
    └── ability-hits.ts     ABILITY_HIT_RULES: how a cast hits when its tooltip's first damage isn't the whole story, its variants,
                            and the casts that are an empowered attack (`empowersAttack`);
                            each champion's rules are in lib/champions/<champion>.ts
```

- **Actions:** `attack`; `ability` (a slot of the selected form, `abilitiesInForm`, with the `variant` picked); `summoner` (a slot); `wait` (seconds). An ability without a point, one its form can't cast (`unavailable`, issue 314) or one on cooldown is refused with the reason, and the sequence goes on. Between them, `situation` markers (below).
- **Timing (issue 395):** an attack waits for the attack timer, starts it, and lands at the end of its windup, which is all it keeps the champion busy for: a cast, a summoner spell or a wait can start right after, while the next plain attack still waits for the timer. The windup is the champion's synced `attackWindup` (`percent` of the attack time, `modifier` on how much bonus attack speed shortens it; wiki "Attack speed": "baseWindupTime + WindupModifier × (currentAttackTotalTime × WindupPercent − baseWindupTime)"), read at the attack's start with the speed its on-attack effects give it. The timer is 1 / attack speed from the attack's start, read after its hit, so effects its hit starts count (Heightened Senses). An ability takes its synced `castTime` (none means instant), except an empowered attack, which takes its attack's windup instead (issue 388); a summoner spell is instant. No projectile travel, critical strikes or animation cancel beyond the windup. Ability cooldowns are the synced ones × 100 / (100 + ability haste), times the `cooldownMultiplier` of each effect running on the attacker that names the slot (issue 397: Fury of the Sands halves Siphoning Strike's for 15 s); summoner spells keep theirs (`spellCooldown`).
- **The combo's time (issue 338, decision 1a):** `duration` is when the last damage landed, a burn's ticks after the last action included (Ignite). It never counts an effect running out or the idle time after the last hit; the kill's time is a hit's too. `activeUntil` is when the last effect or mark still running ran out (Heightened Senses 2 s after the last hit).
- **State:** the time, the cooldowns, the next attack time, the effects running (on the attacker or the target) with their end time and stacks, the target's health and marks. Each step reports the target's armor and magic resist after the reductions it holds then (`resists`, issue 381), absent while it holds none.
- **Events**, in order: `cast`, `hit` (a number, or `notModeled` with the reasons), `on-hit`, `mark-applied`, `mark-consumed`, `expire` (an effect or a mark). Each step logs the events from its action until the next one starts, and its cast's later hits wherever they land (`laterHit.owner`). A hit an earlier step's effect deals once its `delay` or `startsAfter` state is over (Counter Strike's strike, Blaze's detonation) stays with the step running when it lands and names its own step (`delayed.owner`, issue 401). A damage over time's tick is a `hit` with `tick.owner`, the step whose application it belongs to, and each step's `damageOverTime` lists what it applied with the ticks it owns, wherever they landed (issue 345).
- **Starting state (decision 7):** each effect's trigger default (`isOnByDefault`): `always` and `while` effects run, event effects don't. The stats panel's switches never reach the combo, and the combo never changes them; only the build and the match state are shared.
- **Situation markers (issues 330, 338):** `{ kind: "situation", effectId }` anywhere in the actions sets the situation the effect declares as data (`start`, offered by `combatStartOptions`) from that point: `marked` puts its mark on the target for its full duration (Harrier), `running` runs it (Short Fuse ready), `ready` ends its cooldown so its trigger fires next (Hail of Blades ready). Markers before the first action are the starting situation. A marker applies before anything else due at its moment, and owns no events (what follows an action stays on that action's step). Its step reports `situation`: `applied` (with `readyAt` when a use in the combo had it on cooldown), `ignored` in strict mode while a use in the combo still has the effect on cooldown (until `readyAt`; nothing changes), `forced` in free mode in that case (it applies anyway), or `no-effect` (already marked, already running, or an effect the build lacks). The cooldown assumed at the start (below) blocks no marker. An event that uses one says so (`fromSituation` on the `mark-consumed` event and on the spent effect's hit). Nothing is set by default.
- **Periodic and situational effects:** a `periodic` trigger fires on its own once its cooldown is over, while the effect isn't running and its mark has been off the target for `idle` seconds; then it marks the target or runs. A periodic effect, or one that declares a situation, begins on its cooldown at 0, as if just used, unless a marker before the first action sets it: a clean start has no mark and no Hail of Blades. Waits and attack timers move the clock through them, so a wait can show the mark coming back; after the last action nothing periodic fires (a mark would come back forever). Valor's Harrier mark (`cooldownFrom: "mark-end"`, 7 × 0.99 per 1% crit chance, `idle: 1`, which also covers the wiki's 1 s after an ability's mark leaves) and Ziggs's Short Fuse (12 s from the attack that spends it, `reducedOnCast` 4 / 5 / 6 s by level) are the first.
- **Outcomes (issue 338):** each action's step lists the `outcomes` its effects can have, from their triggers alone (`outcomeKeys`): an `on-attack` effect empowering an attack or an empowered attack's cast (with its `charge`, 2/3, or `readyAt` while on cooldown), a mark applied by the cast that triggers its applier, a mark consumed by what its `consumedBy` names, a damage over time applied by the action that triggers it (issue 345: an attack's on-hit poison; ability damage on casts, and on attacks while an ability's effect deals some on them); and whether each happened. A damage over time counts as applied when the step owns an application of it, its later ticks' included (Liandry's burn from Noxious Trap's first tick). Markers, summoner spells and waits have none.
- **Free mode (issue 338):** `CombatInput.free` stops cooldowns from refusing actions, and its `outcomes` (by item, by `outcomeId`) make an outcome happen or not: an attack empowered or not (a running effect sits out that attack), a mark consumed though absent or kept though present, a cast's mark added or prevented, a damage over time prevented (every application the step owns, its ticks' included) or applied at the action's end when the rules didn't (not when a damage over time the step applied will apply it with its ticks). `simulateFreeCombat(input, choices)` runs once without choices, which seeds every outcome (the strict result, cast without cooldowns), then again with the user's choices on top of the seed, so changing one outcome never recomputes the others. Effects' own cooldowns still decide the seed.
- **Each moment's stats** are `computeBuildStats` with the effects running on the attacker (`overrides` from the running set, `stacks` by effect id, and `elapsed`, the seconds since each last triggered), so the evaluation order, stacking groups and soft caps are the panel's. A grant with its own `duration` drops out once it is over while its effect runs on, and a `decay` is read at that moment; a re-trigger restarts both (issue 373).

### What a hit does

- **A basic attack:** at its start, what ends or pauses on an attack and the states an attack breaks (Ambush), then its `on-attack` effects (a ready one triggers with this attack as its first charge, a running one uses a charge and lasts its `duration` longer; it ends after its last charge); at the end of its windup, its total attack damage (physical, no critical strikes yet), each running effect's `onAttackDamage` (a `base` plus `ratios`, Hail of Blades' true damage), `on-hit`, then the marks attacks consume. The next attack's time reads the attack speed with those effects. A mark leaving the target (consumed, expired or overwritten) starts its applier's cooldown when that effect says `cooldownFrom: "mark-end"`.
- **Charges:** each basic attack uses a charge of every running effect with `charges` (its `on-attack` one counted as it triggers); the attack's timer still reads its speed, and the effect ends after the attack that uses its last charge. A re-trigger gives them back.
- **An empowered attack (issue 388):** a cast whose hit rule has `empowersAttack` is one step that casts and hits with the empowered attack (Savagery, Siphoning Strike, Crippling Strike, Decisive Strike, Empower, Last Rites, Power Fist, Crushing Blow, Shield of Daybreak). The cast triggers its effects (`after-ability`, `after-use`, `on-cast`: a spellblade primes, Savagery's attack speed starts) and starts the ability's cooldown; then the attack lands as a basic attack, with the rule's damage as a bonus hit (an ability's, so ability damage) right after the attack's own: `on-attack` effects, charges, on-hit, the marks attacks consume, Black Cleaver's Carve after the attack's hit. It counts as an attack, never a cast, for `endsOn`, `pauses` and `startsAfter` (Rengar's leap out of Thrill of the Hunt; the wiki's "casting anything but Savagery"). It waits for the attack timer unless the rule says `resetsAttack` (every one so far, per the wiki): then it starts at once, right after the previous attack's windup, and starts a new timer, so "AA, Q, AA" is faster than three attacks (wiki "Attack reset": "Resetting the attack timer during the cooldown means that the remaining cooldown is negated, thus allowing a new windup to begin faster than normal"). `noAttackCooldown` leaves the timer as the reset left it, ready, so the next attack starts after its windup (Shield of Daybreak: "does not put Leona's basic attack on cooldown"). `includesAttack` says the synced damage is the whole attack (Savagery's `QTotalDamage` counts 100% AD): the bonus hit is that minus the attack's total attack damage. A formula's `counter` part, a count the build can't know (Siphoning Strike's `stacks`, issue 397), reads the build's match stacks through a `counter` grant (issue 400; see Counters in [Effects](#effects)), never a per-step choice. Such a rule may name a champion off the curated list.
- **An ability's cast:** the effects it triggers (`after-ability`, `after-use` of that ability, `on-cast` of its slot), then its hit, then the marks those effects apply. The hit is the tooltip's first synced damage, or what its `ABILITY_HIT_RULES` entry says (its chosen `variants` entry first: Decimate's outer blade or inner handle, the first by default, or the one marked `default`; a variant without `damage` keeps the rule's): another damage by name, several dealt together (Zac's W: its base and a share of the target's maximum health), none (`damage: null`: Essence Flux only marks), `onHit` (Mystic Shot spends a spellblade) or `notModeled` with the reason (Veigar's R grows with missing health). `whenTargetHas: { effect, damage }` deals another damage while the target holds that effect as the hit lands, read before the cast's own effects (issue 389: Pillar of Flame's `EmpoweredDamage`, 25% more, on a target with Blaze running; a W alone deals its normal damage). An ability's hit consumes the marks abilities do.
- **Several hits (issue 389):** a variant's `hits: { count, every }` makes the cast hit the target `count` times, `every` seconds apart from its first hit. Each later hit lands at its own time (between later actions, or after the last one), triggers the `on-cast` effects marked `perHit` and deals the cast's damage again, as the cast's step: its hits show on that step's card, and what it applies belongs to that step, free mode's choices included. Pyroclasm offers 1, 2 or 3 hits (3 by default, the owner's exception below), 0.3 s apart: the wiki's 0.15 s between bounces, twice, through Brand and back to a lone target; its travel isn't counted. Each hit adds a Blaze stack, so 3 hits detonate Blaze from zero. A rule's `attackSpeedHits` (issue 397) makes the count follow the attacker's bonus attack speed at the cast, spread evenly over `over` seconds: Judgment spins 7 times over 3 s, plus one per 25% bonus attack speed (9 at level 18 from its growth alone), each spin a lone target's `NearestEnemyBonus` (25% more); 6 spins lower its armor by 25% for 6 s (`stacks` with `onlyAtMax`).
- **On-hit:** the `on-hit` effects trigger (Rev'd up gains a stack), then each running effect with `endsOn: "on-hit"` deals its `damage` and `abilityDamage` grants and ends (a spellblade, Short Fuse).
- **A summoner spell:** its `after-use` effects and the `after-summoner` effects bound to it (Nimbus Cloak).
- **Time in an area (issue 353):** a variant's `duration` sets how long the cast's own effects (`after-use` of that ability, `isCastOwnEffect`) run instead of their `duration`, and how long the target stays in the area: it takes every tick up to that moment, the one landing exactly then included, but no more than the effect deals running its own duration, or the variant's when longer (`ticksInArea`). Poison Trail offers 0, 2 or 4 s in the trail (0 s, one pass, by default), each poisoning 2 s more after the target leaves (2, 4 or 6 s: 8, 16 or 24 ticks); Tormented Shadow offers 1, 3 or 5 s in the pool (1 s by default: 3, 7 or 10 ticks, the pool ending before a tick at 5 s). Other effects the cast triggers keep their own duration (Sheen's 10 s).
- **Damage:** `abilityDamage` deals the source ability's synced formula by name when the effect triggers (Harrier's bonus damage). A formula that is a share of the target's health (`ofTargetHealth`) reads its maximum (the dummy's, later the opponent's), current or missing health when the hit lands; a cast's several damages all read it before any of them lands; `damage` deals ratios of the attacker's stats when spent. `damageOverTime` (issue 345) deals one `tick` every `every` seconds while its effect runs, each at its own time, so ticks interleave with later actions and those after the last one count toward the combo's time and the kill. A tick is an amount (Ignite), the source ability's synced formula by name × `scale` (Toxic Shot: `TotalDotDamage` ÷ 4), or a `ratio` of the target's health read when it lands (Liandry's Torment: 1% of its maximum); `missingHealthBonus` adds up to that share more with the target's missing health at the tick (Tormented Shadow). The first tick lands at the application (Tormented Shadow; Ignite, then every 1.056 s: issue 379, the wiki's lower bound of its 0 to 0.264 s first-tick window) or, `firstTick: "delayed"`, one `every` later with the last at the end (Poison Trail, Toxic Shot, Noxious Trap, Deadly Venom, Liandry's). A formula's stats are taken at each application (Toxic Shot doesn't follow later AP). Each is mitigated: armor or magic resist after flat reduction, percent reduction, percent penetration, then lethality and flat penetration (wiki "Armor penetration"), × 100 / (100 + R), or × (2 − 100 / (100 − R)) below 0. True damage is not mitigated. The reductions are the `resistReduction` grants of the effects the target holds when the hit lands (issue 381), each at its stacks (Carve: 6% per stack, 30% at 5); flat ones add up, percent ones multiply.
- **Triggers and ends:** `on-cast` (`slots`, any ability without them; `perHit` also on each later hit of a cast: Blaze's stack per hit) and `on-mark-consumed` (`mark`) start an effect. `applies: { mark, duration, consumedBy }` marks the target; the mark lasts `duration` and is consumed by an attack or an ability's hit (`consumedBy`). `endsOn` ends an effect early: `attack`, `cast` (any ability), `{ kind: "cast", slots }` (a cast of only those abilities), `on-hit`, or a list that ends it on any of them (Rengar's R: `["attack", { kind: "cast", slots: ["W", "E"] }]`, the wiki's "attacking or casting abilities other than Savagery"); its `cooldown` then starts from that moment instead of the trigger (a spellblade's 1.5 s starts when spent). `pauses: { on, grants, seconds }` switches only some of a running effect's stat grants off, by stat, for `seconds` after each `attack` or `cast` in `on`, then back on, while the rest holds (issue 351: Viego's E pauses its movement speed for 1 s, its attack speed staying the whole 8 s); a later event restarts the pause. The cast that starts the effect doesn't pause it. The simulator passes the paused effects to the stats (`paused` in the effects input), and the evaluator gives their paused grants nothing. Re-triggering a running effect refreshes it and adds a stack up to `stacks.max`; the stats scale by stacks / max, and a damage over time deals one tick's damage per stack (Deadly Venom: up to 6). A refresh keeps the tick timer and owns only the ticks it adds: the first application that covers a tick owns it (`tickOwner`). `on-ability-damage` starts an effect whenever an ability's damage lands: a cast's hit, or a hit or tick of an effect whose source is an ability (Toxic Shot's impact and poison); a hit rule's `noCast` refuses a cast of a passive-only ability (Toxic Shot). `on-max-stacks` (`effect`) starts an effect when that one gains its last stack (issue 380: Brand's Blaze, a stack per hit, makes the target unstable at 3). An effect with `resets: { effect, stacks }` sets that effect's stacks and refreshes it when it takes effect, and while it runs that effect stacks no higher: Blaze's detonation waits 2 s (`startsAfter`, "unstable"), deals its synced `ExplosionDamage`, leaves one stack and runs 4 s, the wiki's time with only one stack. `on-damage` (`damageType`) starts one whenever damage of that type lands, from any source, once per moment (Black Cleaver's Carve, issue 381): a basic attack triggers it after its hit, so it doesn't read the reduction it applies, while other damage triggers it first and reads its own (wiki Black Cleaver). An effect with a `delay` takes effect that many seconds after its trigger, all of it then (damage, duration, ticks, marks), for the step that triggered it: Noxious Trap arms for 1 s, so it detonates 1 s after the cast, and its step reports when (`delayed`, "detonates"). An effect with `startsAfter` (issue 372) waits in that state from its trigger (after its `delay`) for the state's `duration`, giving nothing yet; an `attack` or `cast` in its `endsOn` breaks it (Ambush: an attack, or a cast of W or E; issue 378), at the attack's start so that attack's timer reads the new speed, and then the effect runs as if it triggered then (Ambush's attack speed for 6 s). One the target holds runs after the breaking action's hit instead (issue 390: Rengar's leap, his next attack or Savagery's, deals R's `BonusDamage`, then reduces the armor for 4 s; R's cast deals nothing, `damage: null`), and with `needsBreak` running out drops it (no leap, no bonus, no reduction). A `dropsOn` event ends the state without running it (a cast of W or E: Thrill of the Hunt ends, no leap). Each step lists those waiting (`waiting`: its `label`, `from` while the delay still runs, `until`).

### The Combo tab

The tab (issue 265, option A of the design canvas) shows, top to bottom: the action keys and the target, the totals, then one card per step.

```
features/target/   useTarget (controlled: value + onChange, the level injected), TargetEditor; lib/target.ts: presets, ranges,
                   the `target` value (readTargetParam, toTargetParam)
features/combat/   useCombat (controlled CombatState: steps and markers, free mode, its choices; simulated on the injected input),
                   useCombatLink (the CombatState on the link values), useCombatView (step cards, marker lines and totals), useMarkerUndo (add or remove a marker with Undo),
                   useStepReorder (each entry's or group's Move up and Move down buttons, a marker's to the start, announced; drag and drop was dropped
                   in issue 338), useGroupExpansion (which groups show their steps, in memory);
                   lib: combat-sequence (add or insert, remove, move entries or a block past its neighbour or to the start, waits, variants),
                   combat-state (free choices, marker removal), combat-link (CombatState to link values and back), combat-groups (runs of identical steps and their
                   summary), combat-situations, combat-keys, combat-view, combat-format, ability-damage-status,
                   combat-rows (the expanded combo's rows: each hit with its step and the health after it, when each step starts and lands,
                   the running total), combat-timeline (issue 402: the same hits as a vertical timeline: steps at their
                   start, delayed hits at their landing, effects and marks as lanes), combat-timeline-layout (where each
                   card and ruler line goes), combat-action-names;
                   useCombatRows (useCombatView + the rows' order, in memory), useCombatTimeline,
                   useCombatViewMode (List or Timeline, per browser)
pages/champion-build/combo-tab.tsx   assembles the two features; hooks/use-build-combat.ts wires them to the link
pages/champion-build/expanded-combo-page.tsx   the expanded combo (issue 401) on the same combat and target
```

- **Keys:** attack, the selected form's Q W E R, the chosen summoner spells and wait (1 s, editable on its card from 0.25 to 30 s). An ability whose damage the sync could not read in full says "Not modeled" or "Partly modeled" under its key, and in its accessible description.
- **Situation (issue 338, option A2):** under the keys, one chip per situation the build's effects support ("+ Hail of Blades ready", "+ Target marked by Harrier"); nothing shows when the build supports none. A chip adds a marker at the end of the combo; its arrow ("Where to put marker: …", issue 344) opens a menu that adds it at the start or at the end. The new marker is pointed out with an "Undo" notice; one added at the start sits before any group. Markers are thin lines between the cards (label, what it did, ×): in strict mode one on cooldown is dimmed and ignored ("on cooldown until 7.60 s · ignored (use Free mode to force it)"), in free mode it is orange and forced ("on cooldown until 7.60 s · forced"), and one whose situation already holds is dimmed ("already marked · no effect"). They move and go like steps (Move up and Move down buttons, ×), plus a "Move marker … to the start" button (issue 344), with Undo after adding or removing one. They stay with the combo in the link (`m-<effect id>`, where they sit); one for an effect the build no longer has shows "not in this build · no effect".
- **Free mode:** a switch next to the title. Strict computes everything. Free shows a notice ("N changes · Restore computed"), keeps the times with "Free mode: times ignore cooldowns", forces markers strict mode ignores, and turns each card's outcomes into Yes/No answers that start from the computed ones; an answer that differs is marked "changed". The choices stay while free mode is off; removing a marker drops the choices of its outcomes up to the next marker of its effect. An ability card says which outcomes only attacks have ("Hail of Blades and Harrier: attacks only").
- **Inputs and outcomes:** an ability with `variants` shows them in blue on its card in both modes ("Lands: Outer blade | Inner handle"; a rule's `variantsLabel` names other inputs: "In trail: 0 s | 2 s | 4 s", "In pool: 1 s | 3 s | 5 s", "In fire: 1 s | 3 s | 5 s", "In aura: 5 s | 10 s | 15 s", "Hits: 1 | 2 | 3"; a time in an area also says its ticks, "1 s · 3 ticks", under the time on phones); outcomes are gold, read-only in strict ("Hail of Blades 2/3", "Harrier: consumes the mark: yes"; a damage over time applied shows only as its line, one not applied as "Liandry's Torment: applies: no"). In free mode each damage over time application is a Yes/No answer ("Toxic Shot: applies").
- **Moving:** every card and marker has Move up and Move down icon buttons ("Move step 2, Attack up", 44 px to tap on phones); the first can't go up and the last can't go down, and a disabled one keeps the focus. Each move is announced politely.
- **Groups (issue 331, option A: totals plus counts):** 3 or more identical steps in a row (the same action with the same inputs: an ability's variant, a wait's length) show as one block; a marker always splits a group and stays visible. Grouping is a view of the list (`groupRuns`, `groupView` in `combat-groups`); the steps and the simulation don't change. The block shows its time range and "1–8. Attack ×8", its damage by type and total, each outcome as a count over its steps ("Hail of Blades 3/8"), the running effects and marks counted the same way, and each damage over time summed from its steps' lines ("Toxic Shot · applied · refreshed ×7 · 10 ticks · 240 magic · until 10.94 s"); refused steps are counted ("2 refused (left out)"). Its Move up and Move down buttons move the whole group past its neighbour, and × removes all its steps. "Show steps" (per group, in memory, collapsed by default) lists its steps indented, each with its own controls; inside, a step moves only among the group's steps, and removing one that leaves fewer than 3 dissolves the group. A step or a marker outside moves one entry at a time, so it can go inside a run and split it. In free mode a collapsed group shows its counts and "● N changes inside"; its steps' Yes/No answers show once it is open.
- **Cards:** the time first, in bold, then the action, the marks applied or consumed that no outcome reports (with "(from marker)" when a marker put the mark there, like a spent effect's hit), each hit by source (same-source hits add up: "Harrier ×2"), colored by damage type with the type's name, then each damage over time the step applied as one line (issue 345: "Toxic Shot · 4 ticks · 120 magic · until 4.00 s", with "refreshed" or "stacked" first when it was one, and when it took effect for a delayed one: "Noxious Trap · detonates at 3.45 s · 4 ticks · …") whose "ticks" button lists its ticks and their times; it is no step of its own and has no move or remove. A tick counts on the step that owns it (the first application covering it), wherever it landed, so the card's total is its own damage over time included. Then the effects running after it as chips with when they end ("Heightened Senses · until 3.96 s"; not one its damage over time line already shows), what a pause switched off ("Harrowed Path · until 8.00 s · Move Speed paused until 1.00 s") and an effect waiting in its state ("Ambush · camouflaged from 1.00 s", then "Ambush · camouflaged until 11.00 s"; `runningEffectText`), the target's resistances its reductions changed, from its own to now, in the same chips ("Target armor 100 → 70", issue 381; a group shows its last step's), and a thin bar of the target's health. A refused step (cooldown, no point, unavailable in the form) is marked with its reason and adds nothing.
- **Totals:** damage after mitigation, its share of the target's health, the time (the last damage), and the kill (its time and step among the actions) or the health left; in free mode, "N forced markers" under them. Under the damage, inside its cell, the damage by type (issue 355): one small line in the step cards' colors ("46 physical · 101 magic · 250 true", short names "phys" and "mag" in a narrow cell) over a 2 px stacked bar, from the result's `byType` (`damageTypeParts`: only the types that dealt damage, whole percents adding up to 100, "<1%" for a sliver). The percents are in each part's accessible text. Damage over time ticks and free mode's choices are in it like in the total. Under the time, inside its cell, "effects active until 3.96 s" when an effect or mark outlasts the last damage; its two lines stay reserved either way, so the cell never changes height (issue 353 replaced the closing line under the cards). Each figure is a group named by its term, so tests read it by name.
- **Notes:** projectile travel time isn't counted, the combo ignores the stats panel's switches, and match stacks come from the Effects list without growing during the combo. A champion off `CURATED_COMBAT_CHAMPIONS` also gets a note that its numbers aren't checked against the wiki.
- **Expanded combo (issue 401):** from `lg` up, "Expand combo" (the tab's header, the expanded shop's icon) opens `view=combo` and "Collapse combo" comes back to the Combo tab, like the expanded shop (`WorkbenchLayout`'s `combo` view, the same `BuildBar`); focus moves to the other button (`useComboToggleFocus`). It edits the same combo and target, so both screens show every edit. A side column holds the controls (Collapse, Free mode, Clear), the action keys and situation chips, the target, the totals 2x2 and the notes; the steps take a full-height column of rows (`combatRows`): when each lands and starts, the step with its inputs, its hits, outcomes and effects, its damage with its parts ("191 (60 + 131)"), the running total and the target's health. A delayed hit counts on its own step's row (Counter Strike's 77 on E's, "lands 1.00 s"), unlike the tab's cards; a row whose hit lands after the next step started is highlighted. Rows go by hit time (each step's first landing, a step without one at its start) or by step (in memory); Move up and Move down follow the combo's order either way. No groups: one row per step and marker.
- **Timeline (issue 402):** "View: List | Timeline" over the steps, in the Combo tab (phones included) and the expanded combo; List by default. The choice is a per-browser preference (`useCombatViewMode`, localStorage `heimerbuild:combo-view:v1`), shared by both screens and not in the link. `CombatTimeline` is one component for every screen: time flows down a ruler (80 px per second); each step is a card at its start with its windup bar and a dot per hit moment; steps that start together stack, each on its own start column with a connector; a delayed hit (the simulator's `delayed.owner`, or a hit of an effect with a `delay` or `startsAfter`: Counter Strike at 1.00 s, Blaze's detonation) gets its own dashed card at its landing, joined to its step by a dotted track. Effects and marks that ran out are thin lanes at the right with a notch at each step that triggered, refreshed or stacked them; lines mark the last hit and "effects until" (`activeUntil`). From a 36rem wide container up it adds the lanes' legend and, next to each card, the target's health and the effects' bonus hits ("third hit +52"); narrower, it keeps the card's step and damage only. It is a `figure` whose drawing is hidden from screen readers and whose text alternative lists every entry, the lanes and the reference times; the List stays the editable, primary view. Every number comes from `timedHits`, so the cards add up to the totals.
- **Phones:** the same list in the Combo tab of the mobile layout; no expanded combo.

### Adding a champion to the combo

1. Check the coverage report of the sync PR: every damage of the kit must be modeled (`bun run sync-data --coverage-report <file>`).
2. Check each ability's synced formula, cast time and cooldown against the wiki; a cast time the wiki disagrees with goes in the champion's sync file with `defineCastTimes`, listed in `CHAMPION_CAST_TIMES`, a cooldown with `defineCooldowns`, and several kinds (or a damage formula the sync reads wrong) in one `defineAbilityFixes` (README, Data overrides).
3. In the champion's file, `lib/champions/<champion>.ts` (listed in `ABILITY_HIT_RULES` and `ABILITY_EFFECTS`), add a hit rule for each ability whose cast doesn't simply deal its first damage (an empowered next attack is `empowersAttack`, with `includesAttack` when its synced damage counts the attack's, `resetsAttack` per the wiki and `noAttackCooldown` when its attack leaves the timer ready), and an effect for each mechanic (a mark and what consuming it does, a passive's empowered next attack with `endsOn: "on-hit"`, a `periodic` one with its cooldown, attacks empowered by `on-attack` with `charges`, a damage over time held by the target with its tick rate, first tick and `stacks`; its cast's rule then deals `damage: null`). Continuous damage gets real ticks at the wiki's rate (Poison Trail every 0.25 s); a cast of a toggle is one pass through it. A situation players set up (a mark waiting, an empowered attack ready, a rune off cooldown) gets a `start` on that effect, and the Combo tab offers it as a marker. A way to land a cast the simulator can't know (the blade or the handle, near or far) is a `variants` list on the ability's rule; such a rule may name a champion off the curated list. So may one that only moves the cast's damage to an effect of its ability (`damage: null`, the effect's `abilityDamage` naming it: Rengar's R bonus on the leap). The time a target stays in an area is one too: a few preset `duration`s with a `variantsLabel`, in ascending order, the minimum first (the default); so is how many times a bouncing cast hits the target (`hits`, Pyroclasm). A variant marked `default: true` is the default instead of the first, the options staying in ascending order; only for a case the simulator always shows (a lone target, so Pyroclasm's 3 hits, owner decision on PR 391; in a team fight R may hit the target fewer times, and the user picks 1 or 2). A bonus against a target holding an effect is `whenTargetHas` on the rule. A new mechanic is a type plus one evaluator case, never a check on an id.
4. Add the champion to `CURATED_COMBAT_CHAMPIONS`; its test checks the current patch reads its whole kit.

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
