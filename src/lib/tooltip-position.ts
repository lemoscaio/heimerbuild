export type Rect = { top: number; left: number; width: number; height: number }
export type Size = { width: number; height: number }

const GAP = 6
const MARGIN = 8

/** Fixed position for a tooltip: above the anchor when it fits, else below, kept inside the viewport. */
export function tooltipPosition(anchor: Rect, tooltip: Size, viewport: Size) {
	const above = anchor.top - GAP - tooltip.height
	const below = anchor.top + anchor.height + GAP
	const top =
		above >= MARGIN
			? above
			: Math.min(below, viewport.height - MARGIN - tooltip.height)
	const centered = anchor.left + anchor.width / 2 - tooltip.width / 2
	const left = Math.min(
		Math.max(centered, MARGIN),
		viewport.width - MARGIN - tooltip.width,
	)
	return { top: Math.max(top, MARGIN), left: Math.max(left, MARGIN) }
}
