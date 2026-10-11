import {
	type BuildSearch,
	type BuildState,
	toBuildSearch,
} from "@/features/build-calculator/lib/build-search"
import { recordRecentBuild } from "@/features/build-calculator/services/recent-builds"
import type {
	BuildNavigation,
	BuildSource,
	BuildValues,
} from "@/features/build-calculator/types/build-source"
import { parseEffectOverrides } from "@/lib/effects/effect-overrides"
import { parseMatchStacks } from "@/lib/effects/match-stacks"
import { MIN_LEVEL } from "@/lib/stats/growth"
import type { ChampionSwitchSummary } from "../lib/champion-switch"

type UseUrlBuildSourceOptions = {
	championKey: string
	/** The build as read from the URL. */
	search: BuildSearch
	onSearchChange: (search: BuildSearch, navigation: BuildNavigation) => void
	/** Opens the build on another champion as a new history entry, with what the switch kept and reset. */
	onChampionChange: (
		championKey: string,
		search: BuildSearch,
		summary: ChampionSwitchSummary,
	) => void
}

type PageValues = Pick<BuildState, "view" | "tab">

export type UrlBuildSource = ReturnType<typeof useUrlBuildSource>

/**
 * The champion page's URL as the build source, plus the page's view and tab. The only place that
 * turns a build into the URL search and that lists an edited build in the recent builds.
 * Writes keep the link's own patch: changing it would reload the route mid-edit.
 */
export function useUrlBuildSource({
	championKey,
	search,
	onSearchChange,
	onChampionChange,
}: UseUrlBuildSourceOptions) {
	const state: BuildValues = {
		level: search.lvl ?? MIN_LEVEL,
		itemIds: search.items ?? [],
		runes: search.runes,
		form: search.form,
		skills: search.skills,
		summoners: search.summoners,
		smiteUpgrade: search.smite,
		effects: parseEffectOverrides(search.effects),
		currentHealth: search.hp,
		gameTime: search.min,
		matchStacks: parseMatchStacks(search.stacks),
		combo: search.combo,
		free: search.free === 1 || undefined,
		choices: search.choices,
		start: search.start,
		target: search.target,
	}
	const page: PageValues = { view: search.view, tab: search.tab }

	function searchOf(values: BuildValues, nextPage: PageValues) {
		return toBuildSearch({ ...values, patch: search.patch, ...nextPage })
	}

	function record(key: string, values: BuildValues) {
		recordRecentBuild({
			championKey: key,
			level: values.level,
			itemIds: [...values.itemIds],
			patch: search.patch,
			runes: values.runes,
			form: values.form,
			skills: values.skills,
			summoners: values.summoners,
			smiteUpgrade: values.smiteUpgrade,
			effects: values.effects,
			currentHealth: values.currentHealth,
			gameTime: values.gameTime,
			matchStacks: values.matchStacks,
			combo: values.combo,
			free: values.free,
			choices: values.choices,
			start: values.start,
			target: values.target,
		})
	}

	const source: BuildSource = {
		state,
		// A build edit keeps the view and tab, and lists the build in the recent builds (this browser).
		update(patch, navigation) {
			const next = { ...state, ...patch }
			onSearchChange(searchOf(next, page), navigation)
			record(championKey, next)
		},
	}

	return {
		...source,
		/** The overview workbench, the expanded shop or the expanded combo. */
		view: page.view ?? "overview",
		/** The open center tab: Items, Runes, Skills or Combo. */
		tab: page.tab ?? "items",
		/** Saves a view or tab change with the build's `values`; not a build edit, so not recorded. */
		updatePage(
			values: BuildValues,
			nextPage: PageValues,
			navigation: BuildNavigation,
		) {
			onSearchChange(searchOf(values, nextPage), navigation)
		},
		/** Opens `values` on `nextChampionKey` in the same patch, view and tab, as an edit of the recent builds. */
		switchChampion(
			nextChampionKey: string,
			values: BuildValues,
			summary: ChampionSwitchSummary,
		) {
			onChampionChange(nextChampionKey, searchOf(values, page), summary)
			record(nextChampionKey, values)
		},
		/** The search of a link to `values` pinned to `patch`, in the current view and tab. */
		shareSearch(values: BuildValues, patch: string) {
			return toBuildSearch({ ...values, patch, ...page })
		},
	}
}
