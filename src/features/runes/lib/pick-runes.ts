import type { RuneTree } from "@schemas/rune"
import { type RuneSelection, runeRowIndex } from "@/lib/rune-selection"

const SECONDARY_RUNES = 2

function replaceAt<T>(list: readonly T[], index: number, value: T): T[] {
	const next = [...list]
	next[index] = value
	return next
}

/** A new primary tree starts empty; a secondary tree equal to it is cleared. */
export function pickPrimaryTree(
	selection: RuneSelection,
	treeId: number,
): RuneSelection {
	if (selection.primary?.treeId === treeId) return selection
	return {
		...selection,
		primary: { treeId, runeIds: [] },
		secondary:
			selection.secondary?.treeId === treeId ? undefined : selection.secondary,
	}
}

export function pickKeystone(
	selection: RuneSelection,
	keystoneId: number,
): RuneSelection {
	if (!selection.primary) return selection
	return { ...selection, primary: { ...selection.primary, keystoneId } }
}

export function pickPrimaryRune(
	selection: RuneSelection,
	row: number,
	runeId: number,
): RuneSelection {
	if (!selection.primary) return selection
	return {
		...selection,
		primary: {
			...selection.primary,
			runeIds: replaceAt(selection.primary.runeIds, row, runeId),
		},
	}
}

/** The secondary tree can be any tree but the primary one; changing it clears its runes. */
export function pickSecondaryTree(
	selection: RuneSelection,
	treeId: number,
): RuneSelection {
	if (
		selection.primary?.treeId === treeId ||
		selection.secondary?.treeId === treeId
	) {
		return selection
	}
	return { ...selection, secondary: { treeId, runeIds: [] } }
}

/**
 * Two runes from different rows, as in game: a pick replaces the one in its row,
 * and a pick in a third row replaces the oldest.
 */
export function pickSecondaryRune(
	selection: RuneSelection,
	tree: RuneTree,
	runeId: number,
): RuneSelection {
	const { secondary } = selection
	const row = runeRowIndex(tree, runeId)
	if (secondary?.treeId !== tree.id || row === -1) return selection
	const others = secondary.runeIds.filter(
		(id) => runeRowIndex(tree, id) !== row,
	)
	return {
		...selection,
		secondary: {
			...secondary,
			runeIds: [...others, runeId].slice(-SECONDARY_RUNES),
		},
	}
}

export function pickShard(
	selection: RuneSelection,
	row: number,
	shardId: number,
): RuneSelection {
	return { ...selection, shardIds: replaceAt(selection.shardIds, row, shardId) }
}
