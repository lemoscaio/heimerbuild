import type { BuildValues } from "@/features/build-calculator/types/build-source"
import type { EffectOverrides } from "@/lib/effects/effect"
import { type MatchStacks, matchStackSources } from "@/lib/effects/match-stacks"
import { ABILITY_EFFECTS } from "@/lib/effects/registries/ability-effects"

/** A part of the build that only fits its champion. */
export type ChampionSwitchReset =
	| "form"
	| "skills"
	| "effects"
	| "stacks"
	| "combo"

/** A kept part the switch notice names; the level is always kept. */
export type ChampionSwitchKept = "items" | "runes" | "spells"

/** What a switch kept and reset, for the notice on the new champion. */
export type ChampionSwitchSummary = {
	kept: ChampionSwitchKept[]
	resets: ChampionSwitchReset[]
}

const ABILITY_EFFECT_IDS = new Set(ABILITY_EFFECTS.map(({ id }) => id))

/** The match stack sources a champion's abilities read (Siphoning Strike's), not an item's. */
const CHAMPION_STACK_IDS = new Set(
	ABILITY_EFFECTS.flatMap((effect) =>
		matchStackSources(effect).map(({ id }) => id),
	),
)

/** The effect choices that are not a champion's ability effect (Ghost, a rune's), or none. */
function sharedEffects(effects: EffectOverrides | undefined) {
	const kept = Object.entries(effects ?? {}).filter(
		([id]) => !ABILITY_EFFECT_IDS.has(id),
	)
	return kept.length ? Object.fromEntries(kept) : undefined
}

/** The match stacks that are not a champion's ability's, or none. */
function sharedStacks(stacks: MatchStacks | undefined) {
	const kept = Object.entries(stacks ?? {}).filter(
		([id]) => !CHAMPION_STACK_IDS.has(id),
	)
	return kept.length ? Object.fromEntries(kept) : undefined
}

/**
 * The build's values on another champion: items, runes, summoner spells, level, current health and
 * the game time stay; the form, skill points, ability effect choices, the champion's match stacks
 * and the combo (its free mode, choices, start cooldowns and target included) go. `resets` lists only what the build had.
 */
export function switchChampionValues(values: BuildValues): {
	values: BuildValues
	summary: ChampionSwitchSummary
} {
	const {
		form,
		skills,
		effects,
		combo,
		free,
		choices,
		start,
		target,
		...kept
	} = values
	const keptEffects = sharedEffects(effects)
	const keptStacks = sharedStacks(kept.matchStacks)
	const resets: ChampionSwitchReset[] = []
	if (form) resets.push("form")
	if (skills) resets.push("skills")
	if (Object.keys(effects ?? {}).length > Object.keys(keptEffects ?? {}).length)
		resets.push("effects")
	if (
		Object.keys(kept.matchStacks ?? {}).length >
		Object.keys(keptStacks ?? {}).length
	)
		resets.push("stacks")
	if (combo || free || choices || start || target) resets.push("combo")

	const keptParts: ChampionSwitchKept[] = []
	if (kept.itemIds.length) keptParts.push("items")
	if (kept.runes) keptParts.push("runes")
	if (kept.summoners) keptParts.push("spells")

	return {
		values: { ...kept, effects: keptEffects, matchStacks: keptStacks },
		summary: { kept: keptParts, resets },
	}
}
