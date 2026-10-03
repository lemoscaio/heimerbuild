import type { ChampionSpell } from "@schemas/champion"
import { isInPatchRange } from "@schemas/patch-range"
import type { Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { AbilityRanks } from "../stats/rank-stats"
import type { BuildEffect, Effect } from "./effect"
import { ABILITY_EFFECTS } from "./registries/ability-effects"
import { ITEM_EFFECTS } from "./registries/item-effects"
import { RUNE_EFFECTS } from "./registries/rune-effects"
import { SUMMONER_EFFECTS } from "./registries/summoner-effects"

/** What decides which effects a build has: the champion and its ranks, the spells and the page's runes. */
export type EffectsBuild = {
	/** The build's patch ("16.19.1"): only the effect versions in force on it count. */
	patch: string
	champion: {
		key: string
		abilities: {
			spells: readonly Pick<ChampionSpell, "slot" | "name" | "icon">[]
		}
	}
	ranks: AbilityRanks
	/** The chosen summoner spells. */
	spells: readonly SummonerSpell[]
	/** The rune page's runes. */
	runes: readonly Rune[]
}

/** Every registry, one per source. */
export const EFFECT_REGISTRIES: readonly (readonly Effect[])[] = [
	ABILITY_EFFECTS,
	SUMMONER_EFFECTS,
	RUNE_EFFECTS,
	ITEM_EFFECTS,
]

function named(
	effect: Effect,
	{ name, icon }: { name: string; icon: string },
): BuildEffect {
	return { id: effect.id, effect, name, icon }
}

/** The effect bound to its source in the build, or nothing when the build lacks the source. */
function bindSource(effect: Effect, build: EffectsBuild): BuildEffect[] {
	const { source } = effect
	switch (source.kind) {
		case "ability": {
			const ability = build.champion.abilities.spells.find(
				({ slot }) => slot === source.slot,
			)
			const isRanked =
				build.champion.key === source.championKey &&
				build.ranks[source.slot] > 0
			return ability && isRanked
				? [{ ...named(effect, ability), slot: source.slot }]
				: []
		}
		case "summoner": {
			const spell = build.spells.find(({ key }) => key === source.spellKey)
			return spell ? [{ ...named(effect, spell), spell }] : []
		}
		case "rune": {
			const rune = build.runes.find(({ key }) => key === source.runeKey)
			return rune ? [named(effect, rune)] : []
		}
		// Item effects wait for the combo timeline (stage 2).
		case "item":
			return []
	}
}

function slug(name: string) {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
}

/** An effect any summoner spell triggers becomes one effect per chosen spell, reading that spell. */
function bindTrigger(bound: BuildEffect, build: EffectsBuild): BuildEffect[] {
	if (bound.effect.trigger.kind !== "after-summoner") return [bound]
	return build.spells.map((spell) => ({
		...bound,
		id: `${bound.id}-${slug(spell.name)}`,
		spell,
	}))
}

/** The effects in force on the build's patch whose source is in it: a ranked ability, a chosen spell, a rune of the page. */
export function availableEffects(
	build: EffectsBuild,
	registries: readonly (readonly Effect[])[] = EFFECT_REGISTRIES,
): BuildEffect[] {
	return registries
		.flat()
		.filter((effect) => isInPatchRange(build.patch, effect))
		.flatMap((effect) => bindSource(effect, build))
		.flatMap((bound) => bindTrigger(bound, build))
}
