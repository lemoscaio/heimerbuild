/** Sizes shared by the rune rows and their skeletons, so a skeleton takes the same space. */
export const RUNE_SIZE_CLASSES = {
	keystone: "size-12 lg:size-12.5",
	rune: "size-11 lg:size-10",
} as const

export const RUNE_ROW_GAP_CLASSES = {
	keystone: "gap-4",
	rune: "gap-3 lg:gap-5.5",
} as const

export type RuneSize = keyof typeof RUNE_SIZE_CLASSES

/** The small gold caption of a rail ("Keystones", "Pick 2", "Stat shards"). */
export const RAIL_LABEL_CLASSES =
	"font-semibold text-[10px] text-gold uppercase tracking-[0.14em]"
