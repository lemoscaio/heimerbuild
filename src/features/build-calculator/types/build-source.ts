import type { BuildState } from "../lib/build-search"

/** A build's own values: no patch, view or tab. */
export type BuildValues = Omit<BuildState, "patch" | "view" | "tab">

/** How an edit lands in the browser history: `replace` swaps the current entry, else Back undoes it. */
export type BuildNavigation = { replace: boolean }

/**
 * Where a build's values live and how an edit is saved: the champion page's URL today, and later
 * a source per build instance (an opponent, a comparison).
 */
export type BuildSource = {
	state: BuildValues
	update: (patch: Partial<BuildValues>, navigation: BuildNavigation) => void
}
