import type { AbilitySlot } from "@schemas/champion"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import { useSummonerSpells } from "@/data/hooks/use-summoner-spells"
import { useBuildItems } from "@/features/build-calculator/hooks/use-build-items"
import type {
	BuildNavigation,
	BuildSource,
	BuildValues,
} from "@/features/build-calculator/types/build-source"
import { useChampionState } from "@/features/champions/hooks/use-champion-state"
import type { ChampionStateValue } from "@/features/champions/lib/champion-state"
import { useConditions } from "@/features/conditions/hooks/use-conditions"
import { useMatchState } from "@/features/match/hooks/use-match-state"
import { useRunePage } from "@/features/runes/hooks/use-rune-page"
import { useSkills } from "@/features/skills/hooks/use-skills"
import { useSummoners } from "@/features/summoners/hooks/use-summoners"
import type { ComboLink } from "@/lib/combat/combo-link"
import type { CombatBuild } from "@/lib/combat/simulate-combat"
import { dropUnusedComboStart } from "@/lib/combat/start-cooldowns"
import {
	availableEffects,
	combatEffects,
	type EffectsBuild,
} from "@/lib/effects/available-effects"
import { abilitiesInForm } from "@/lib/form-abilities"
import { selectedRunes } from "@/lib/rune-selection"
import { itemsAdaptiveType } from "@/lib/stats/adaptive-force"
import { formStats } from "@/lib/stats/champion-forms"
import {
	type BuildStatsInput,
	buildAbilityCounters,
	computeBuildStats,
	percentBonusBasis,
	statBonusBasis,
} from "@/lib/stats/compute-build-stats"
import { attackTypeAtLevel } from "@/lib/stats/level-states"
import {
	type CompositionInput,
	type CompositionOptions,
	statComposition,
} from "@/lib/stats/stat-composition"
import { dropUnusedConditionValues } from "../lib/condition-values"

type UseChampionBuildOptions = {
	patch: string
	championKey: string
	/** Where the build's values live and where its edits are saved. */
	source: BuildSource
}

/**
 * Browser history per edit: Back undoes an item edit and a combo emptied (Clear, or its last entry
 * removed); every other edit replaces the entry, so building a combo step by step never floods Back.
 */
const EDIT_HISTORY = {
	championState: { replace: true },
	skills: { replace: true },
	items: { replace: false },
	runes: { replace: true },
	summoners: { replace: true },
	match: { replace: true },
	effects: { replace: true },
	combo: { replace: true },
	comboEmptied: { replace: false },
	target: { replace: true },
} as const satisfies Record<string, BuildNavigation>

export type ChampionBuild = ReturnType<typeof useChampionBuild>

/**
 * A champion's build, composed from one hook per domain on a build source: champion state, skills,
 * items, rune page, summoner spells, match state and conditions (the effects turned on), plus the
 * combo's values. Their values only come together in the stats and in each saved edit.
 */
export function useChampionBuild({
	patch,
	championKey,
	source,
}: UseChampionBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const { data: runes } = useRunes(patch)
	const { data: summonerSpells } = useSummonerSpells(patch)
	const { state } = source

	// Skills read the level, and the champion state reads the ranks that unlock a form.
	const skills = useSkills({
		champion,
		level: state.level,
		value: state.skills,
		onChange: (value) => save({ skills: value }, EDIT_HISTORY.skills),
	})
	const championState = useChampionState({
		champion,
		ranks: skills.ranks,
		value: {
			level: state.level,
			form: state.form,
			currentHealth: state.currentHealth,
		},
		onChange: changeChampionState,
	})
	// The abilities shown follow the selected form; their ranks stay per slot.
	const abilities =
		champion && abilitiesInForm(champion.abilities, championState.form?.id)
	const matchState = useMatchState({
		value: { gameTime: state.gameTime, matchStacks: state.matchStacks },
		onChange: (change) => save(change, EDIT_HISTORY.match),
	})
	const items = useBuildItems({
		itemsById,
		value: state.itemIds,
		onChange: (itemIds) => save({ itemIds }, EDIT_HISTORY.items),
	})
	const runePage = useRunePage({
		runes,
		value: state.runes,
		onChange: (value) => save({ runes: value }, EDIT_HISTORY.runes),
	})
	const summoners = useSummoners({
		spells: summonerSpells,
		value: state.summoners,
		onChange: (value) => save({ summoners: value }, EDIT_HISTORY.summoners),
	})
	// Conditions read the other domains: the ranked abilities, the spells, the page's runes and the items.
	const effectsBuild: EffectsBuild | undefined =
		champion && skills.ranks && summonerSpells && runes && itemsById
			? {
					patch,
					champion,
					ranks: skills.ranks,
					spells: summoners.slots.filter((spell) => spell !== undefined),
					runes: selectedRunes(runePage.selection, runes),
					items: items.list,
				}
			: undefined
	const effects = effectsBuild && availableEffects(effectsBuild)
	const fightEffects = effectsBuild && combatEffects(effectsBuild)
	const basisInput = statsInput()
	const conditions = useConditions({
		available: effects,
		context: {
			level: championState.level,
			currentHealth: championState.currentHealth,
			gameTime: matchState.gameTime,
			matchStacks: matchState.matchStacks,
			ranks: skills.ranks,
			rankStats: champion?.rankStats,
			adaptiveType:
				champion && itemsAdaptiveType(champion.adaptiveType, items.list),
			totals: basisInput && statBonusBasis(basisInput),
			percentBasis: basisInput && percentBonusBasis(basisInput),
			form: championState.form?.id,
			attackType:
				champion &&
				attackTypeAtLevel(champion, championState.level, {
					form: championState.formValue,
					ranks: skills.ranks,
				}),
		},
		value: state.effects ?? {},
		onChange: (value) => save({ effects: value }, EDIT_HISTORY.effects),
	})

	/**
	 * The checked values every edit saves next to its own change (the link's while data loads),
	 * without unused condition values or start cooldowns.
	 */
	const values: BuildValues = dropUnusedConditionValues(
		{
			level: championState.level,
			itemIds: items.ids,
			runes: runePage.value,
			form: championState.formValue,
			skills: state.skills,
			summoners: summoners.value,
			effects: conditions.value,
			currentHealth: state.currentHealth,
			gameTime: state.gameTime,
			matchStacks: state.matchStacks,
			combo: state.combo,
			free: state.free,
			choices: state.choices,
			start: dropUnusedComboStart(state.start, fightEffects),
			target: state.target,
		},
		effects,
	)

	function save(change: Partial<BuildValues>, navigation: BuildNavigation) {
		source.update(
			dropUnusedConditionValues({ ...values, ...change }, effects),
			navigation,
		)
	}

	function saveCombo(change: ComboLink) {
		const emptied = !!state.combo && !change.combo
		save(change, emptied ? EDIT_HISTORY.comboEmptied : EDIT_HISTORY.combo)
	}

	// Level → skills: a new level also saves the points it keeps, or brings back the ones it kept.
	function changeChampionState(change: Partial<ChampionStateValue>) {
		save(
			change.level === undefined
				? change
				: { ...change, skills: skills.valueAtLevel(change.level) },
			EDIT_HISTORY.championState,
		)
	}

	/**
	 * The build's stats input with `change` applied. It reads the link's effect choices, which give the
	 * same active effects as the checked ones: checking only drops choices that change nothing.
	 */
	function statsInput(
		change: Partial<BuildStatsInput> = {},
	): BuildStatsInput | undefined {
		if (!champion) return undefined
		return {
			champion,
			patch,
			level: championState.level,
			form: championState.formValue,
			items: items.list,
			shards: runePage.shards,
			ranks: skills.ranks,
			effects: { available: effects ?? [], overrides: state.effects ?? {} },
			currentHealth: championState.currentHealth,
			gameTime: matchState.gameTime,
			matchStacks: matchState.matchStacks,
			...change,
		}
	}

	/**
	 * What the combo runs on: the build and match state, every effect its sources have (items
	 * included) and the summoner slots; never the effect switches (issue 265, decision 7).
	 */
	function combatInput() {
		const input = statsInput()
		if (!champion || !input || !fightEffects) return undefined
		const { effects: _switches, ...build } = input
		return {
			build: { ...build, champion } satisfies CombatBuild,
			effects: fightEffects,
			summoners: summoners.slots,
		}
	}

	/** The build's totals with `change` applied: every preview is the same call with one input changed. */
	function whatIf(change: Partial<BuildStatsInput> = {}) {
		const input = statsInput(change)
		return input && computeBuildStats(input)
	}

	/** `whatIf(change)`'s totals split by source, which add up to them. */
	function compositionIf(
		change: Partial<CompositionInput> = {},
		options: CompositionOptions = {},
	) {
		const input = statsInput(change)
		return (
			input &&
			statComposition({ ...input, items: change.items ?? items.list }, options)
		)
	}

	return {
		champion,
		championState,
		skills,
		/** The champion's abilities in the selected form (Cannon Jayce's Shock Blast). */
		abilities,
		items,
		runePage,
		summoners,
		/** The match's game time and the build's match stacks. */
		matchState,
		conditions,
		/** Totals with the items, stat shards, ranks and the effects turned on. */
		stats: whatIf(),
		/** Totals without the stat shards: the base of the runes preview. */
		statsWithoutRunes: whatIf({ shards: [] }),
		whatIf,
		compositionIf,
		/** Bonus attack speed reads as a percent of this, the selected form's ratio. */
		attackSpeedRatio:
			champion &&
			formStats(champion, {
				form: championState.formValue,
				ranks: skills.ranks,
			}).stats.attackSpeed.ratio,
		/** The counts each ability's damage formulas read (Siphoning Strike's stacks), with the effects turned on. */
		abilityCounters: (ability: AbilitySlot | "passive") => {
			const input = statsInput()
			return input ? buildAbilityCounters(input, ability) : {}
		},
		/** The combo's build, effects and summoner slots; undefined while the data loads. */
		combat: combatInput(),
		/** The combo's steps and markers, free mode, its choices and start cooldowns, as link values. */
		combo: {
			value: {
				combo: state.combo,
				free: state.free,
				choices: state.choices,
				start: state.start,
			} satisfies ComboLink,
			onChange: saveCombo,
		},
		/** The combo's target, as the `target` value. */
		target: {
			value: state.target,
			onChange: (target: string | undefined) =>
				save({ target }, EDIT_HISTORY.target),
		},
		/** The checked values: known items, checked runes, summoner spells and effects, the default form left out. */
		values,
	}
}
