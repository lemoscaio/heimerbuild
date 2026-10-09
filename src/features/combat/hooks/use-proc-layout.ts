/** Where a step's procs show: inside its card or row, or among the steps at their land time. */
export type ProcLayout = "inside" | "outside"

// PROTOTYPE (PR 434, remove before merge): `?procs=outside` on the page's load shows the outside layout,
// read once since the link writer drops unknown params on the next edit.
const LAYOUT: ProcLayout =
	typeof window !== "undefined" &&
	new URLSearchParams(window.location.search).get("procs") === "outside"
		? "outside"
		: "inside"

/** PROTOTYPE (PR 434): the procs' layout the page loaded with; inside unless `?procs=outside`. */
export function useProcLayout(): ProcLayout {
	return LAYOUT
}
