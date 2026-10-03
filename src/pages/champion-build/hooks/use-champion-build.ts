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
import { useRunePage } from "@/features/runes/hooks/use-rune-page"
import { useSkills } from "@/features/skills/hooks/use-skills"
import { useSummoners } from "@/features/summoners/hooks/use-summoners"
import { availableEffects } from "@/lib/effects/available-effects"
import { selectedRunes } from "@/lib/rune-selection"
import { itemsAdaptiveType } from "@/lib/stats/adaptive-force"
import {
	type BuildStatsInput,
	computeBuildStats,
	statBonusBasis,
} from "@/lib/stats/compute-build-stats"

type UseChampionBuildOptions = {
	patch: string
	championKey: string
	/** Where the build's values live and where its edits are saved. */
	source: BuildSource
}

/** Browser history per edit: Back undoes an item edit; every other edit replaces the entry. */
const EDIT_HISTORY = {
	championState: { replace: true },
	skills: { replace: true },
	items: { replace: false },
	runes: { replace: true },
	summoners: { replace: true },
	effects: { replace: true },
} as const satisfies Record<string, BuildNavigation>

export type ChampionBuild = ReturnType<typeof useChampionBuild>

/**
 * A champion's build, composed from one hook per domain on a build source: champion state, skills,
 * items, rune page, summoner spells and conditions (the effects turned on). Their values only come together in the stats and in each saved edit.
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

	const championState = useChampionState({
		champion,
		value: { level: state.level, form: state.form },
		onChange: changeChampionState,
	})
	const skills = useSkills({
		champion,
		level: championState.level,
		value: state.skills,
		onChange: (value) => save({ skills: value }, EDIT_HISTORY.skills),
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
	// Conditions read the other domains: the ranked abilities, the spells and the page's runes.
	const effects =
		champion && skills.ranks && summonerSpells && runes
			? availableEffects({
					patch,
					champion,
					ranks: skills.ranks,
					spells: summoners.slots.filter((spell) => spell !== undefined),
					runes: selectedRunes(runePage.selection, runes),
				})
			: undefined
	const basisInput = statsInput()
	const conditions = useConditions({
		effects,
		context: {
			level: championState.level,
			ranks: skills.ranks,
			rankStats: champion?.rankStats,
			adaptiveType:
				champion && itemsAdaptiveType(champion.adaptiveType, items.list),
			totals: basisInput && statBonusBasis(basisInput),
		},
		value: {
			effects: state.effects ?? {},
			currentHealth: state.currentHealth,
			gameTime: state.gameTime,
		},
		onChange: (value) =>
			save(
				{
					effects: value.effects,
					currentHealth: value.currentHealth,
					gameTime: value.gameTime,
				},
				EDIT_HISTORY.effects,
			),
	})

	/** The checked values every edit saves next to its own change (the link's while data loads). */
	const values: BuildValues = {
		level: championState.level,
		itemIds: items.ids,
		runes: runePage.value,
		form: championState.formValue,
		skills: state.skills,
		summoners: summoners.value,
		effects: conditions.value.effects,
		currentHealth: conditions.value.currentHealth,
		gameTime: conditions.value.gameTime,
	}

	function save(change: Partial<BuildValues>, navigation: BuildNavigation) {
		source.update({ ...values, ...change }, navigation)
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
	 * The build's stats input with `change` applied. It reads the link's conditions, which give the
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
			currentHealth: state.currentHealth,
			gameTime: state.gameTime,
			...change,
		}
	}

	/** The build's totals with `change` applied: every preview is the same call with one input changed. */
	function whatIf(change: Partial<BuildStatsInput> = {}) {
		const input = statsInput(change)
		return input && computeBuildStats(input)
	}

	return {
		champion,
		championState,
		skills,
		items,
		runePage,
		summoners,
		conditions,
		/** Totals with the items, stat shards, ranks and the effects turned on. */
		stats: whatIf(),
		/** Totals without the stat shards: the base of the runes preview. */
		statsWithoutRunes: whatIf({ shards: [] }),
		whatIf,
		/** The checked values: known items, checked runes, summoner spells and effects, the default form left out. */
		values,
	}
}
