import type {
	AbilitySlot,
	Champion,
	ChampionPassive,
	ChampionSpell,
} from "@schemas/champion"
import type { Item } from "@schemas/item"
import { isInPatchRange } from "@schemas/patch-range"
import type { Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { spellInForm } from "../form-abilities"
import type { AbilityRanks } from "../stats/rank-stats"
import { boostSlots } from "./boosts"
import { isListed } from "./defaults"
import type { BuildEffect, Effect } from "./effect"
import { ABILITY_EFFECTS } from "./registries/ability-effects"
import { ITEM_EFFECTS } from "./registries/item-effects"
import { RUNE_EFFECTS } from "./registries/rune-effects"
import { SUMMONER_EFFECTS } from "./registries/summoner-effects"

/** What decides which effects a build has: the champion and its ranks, the spells and the page's runes. */
type EffectAbility = Pick<ChampionSpell, "slot" | "name" | "icon"> &
	Partial<Pick<ChampionSpell, "rankValues">>

export type EffectsBuild = {
	/** The build's patch ("16.19.1"): only the effect versions in force on it count. */
	patch: string
	champion: {
		key: string
		/** The champion's forms, which name the form an effect holds in. */
		forms?: Champion["forms"]
		/** The default form's abilities, and the ones another form swaps in, which its bound effects read. */
		abilities: {
			/** Its passive, which a passive's effects (Quinn's Harrier) are named after. */
			passive?: Pick<ChampionPassive, "name" | "icon">
			spells: readonly EffectAbility[]
			forms?: Readonly<
				Record<string, Partial<Record<AbilitySlot, EffectAbility>>>
			>
		}
	}
	ranks: AbilityRanks
	/** The chosen summoner spells. */
	spells: readonly SummonerSpell[]
	/** The rune page's runes. */
	runes: readonly Rune[]
	/** The chosen items. */
	items?: readonly Pick<Item, "id" | "name" | "icon">[]
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

/** The other abilities the effect's amounts read (GNAR! for Hyper), as its form shows them. */
function boostsOf(effect: Effect, build: EffectsBuild): Partial<BuildEffect> {
	const boosts = Object.fromEntries(
		boostSlots(effect).flatMap((slot) => {
			const ability = spellInForm(build.champion.abilities, slot, effect.form)
			return ability
				? [[slot, { name: ability.name, rankValues: ability.rankValues }]]
				: []
		}),
	)
	return Object.keys(boosts).length ? { boosts } : {}
}

/** The effect bound to its source in the build, or nothing when the build lacks the source. */
function bindSource(effect: Effect, build: EffectsBuild): BuildEffect[] {
	const { source } = effect
	switch (source.kind) {
		case "ability": {
			if (source.slot === "passive") {
				const { passive } = build.champion.abilities
				return passive && build.champion.key === source.championKey
					? [named(effect, passive)]
					: []
			}
			// A form-bound effect reads its form's ability (its row and rank lines); the others the default's.
			const ability = spellInForm(
				build.champion.abilities,
				source.slot,
				effect.form,
			)
			const isRanked =
				build.champion.key === source.championKey &&
				build.ranks[source.slot] > 0
			const formName = build.champion.forms?.find(
				({ id }) => id === effect.form,
			)?.name
			return ability && isRanked
				? [
						{
							...named(effect, ability),
							slot: source.slot,
							rankValues: ability.rankValues,
							...(formName && { formName }),
							...boostsOf(effect, build),
						},
					]
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
		case "item": {
			const item = build.items?.find(({ id }) => id === source.itemId)
			return item ? [named(effect, item)] : []
		}
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

/**
 * Every effect in force on the build's patch whose source is in it (a ranked ability, the
 * champion's passive, a chosen spell, a rune of the page, a chosen item): what the combat simulator reads.
 */
export function combatEffects(
	build: EffectsBuild,
	registries: readonly (readonly Effect[])[] = EFFECT_REGISTRIES,
): BuildEffect[] {
	return registries
		.flat()
		.filter((effect) => isInPatchRange(build.patch, effect))
		.flatMap((effect) => bindSource(effect, build))
		.flatMap((bound) => bindTrigger(bound, build))
}

/**
 * The effects the stats panel lists and switches: the build's own, without those only a combat
 * sequence fires (`isListed`).
 */
export function availableEffects(
	build: EffectsBuild,
	registries: readonly (readonly Effect[])[] = EFFECT_REGISTRIES,
): BuildEffect[] {
	return combatEffects(build, registries).filter(({ effect }) =>
		isListed(effect),
	)
}
