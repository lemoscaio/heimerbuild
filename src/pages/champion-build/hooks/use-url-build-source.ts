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
import { MIN_LEVEL } from "@/lib/stats/growth"

type UseUrlBuildSourceOptions = {
	championKey: string
	/** The build as read from the URL. */
	search: BuildSearch
	onSearchChange: (search: BuildSearch, navigation: BuildNavigation) => void
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
}: UseUrlBuildSourceOptions) {
	const state: BuildValues = {
		level: search.lvl ?? MIN_LEVEL,
		itemIds: search.items ?? [],
		runes: search.runes,
		form: search.form,
		skills: search.skills,
		summoners: search.summoners,
		effects: parseEffectOverrides(search.effects),
		currentHealth: search.hp,
		gameTime: search.min,
	}
	const page: PageValues = { view: search.view, tab: search.tab }

	function write(
		values: BuildValues,
		nextPage: PageValues,
		navigation: BuildNavigation,
	) {
		onSearchChange(
			toBuildSearch({ ...values, patch: search.patch, ...nextPage }),
			navigation,
		)
	}

	const source: BuildSource = {
		state,
		// A build edit keeps the view and tab, and lists the build in the recent builds (this browser).
		update(patch, navigation) {
			const next = { ...state, ...patch }
			write(next, page, navigation)
			recordRecentBuild({
				championKey,
				level: next.level,
				itemIds: [...next.itemIds],
				patch: search.patch,
				runes: next.runes,
				form: next.form,
				skills: next.skills,
				summoners: next.summoners,
				effects: next.effects,
				currentHealth: next.currentHealth,
				gameTime: next.gameTime,
			})
		},
	}

	return {
		...source,
		/** The overview workbench or the expanded shop. */
		view: page.view ?? "overview",
		/** The open center tab: Items, Runes or Skills. */
		tab: page.tab ?? "items",
		/** Saves a view or tab change with the build's `values`; not a build edit, so not recorded. */
		updatePage(
			values: BuildValues,
			nextPage: PageValues,
			navigation: BuildNavigation,
		) {
			write(values, nextPage, navigation)
		},
		/** The search of a link to `values` pinned to `patch`, in the current view and tab. */
		shareSearch(values: BuildValues, patch: string) {
			return toBuildSearch({ ...values, patch, ...page })
		},
	}
}
