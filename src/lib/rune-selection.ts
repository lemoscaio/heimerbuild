import type { Rune, RunesFile, RuneTree, Shard } from "@schemas/rune"

/** A rune page, possibly incomplete. Ids are Data Dragon / CommunityDragon perk ids. */
export type RuneSelection = {
	primary?: {
		treeId: number
		keystoneId?: number
		/** One pick per row of the tree, `undefined` until chosen. */
		runeIds: readonly (number | undefined)[]
	}
	secondary?: {
		treeId: number
		/** Up to two runes from different rows, oldest first. */
		runeIds: readonly number[]
	}
	/** One pick per shard row (Offense, Flex, Defense). */
	shardIds: readonly (number | undefined)[]
}

export const EMPTY_RUNE_SELECTION: RuneSelection = { shardIds: [] }

const ROW_COUNT = 3
const NONE = 0
const PART_SEPARATOR = "_"
const ID_SEPARATOR = "-"

/** Shape of the `runes` URL value before it is checked against the data. */
export const RUNES_PARAM_PATTERN = /^[\d-]{1,60}_[\d-]{0,30}_[\d-]{0,30}$/

export function isRuneSelectionEmpty(selection: RuneSelection) {
	return (
		!selection.primary &&
		!selection.secondary &&
		!selection.shardIds.some((id) => id !== undefined)
	)
}

function ids(values: readonly (number | undefined)[], length?: number) {
	const padded = length
		? Array.from({ length }, (_, index) => values[index])
		: values
	return padded.map((id) => id ?? NONE).join(ID_SEPARATOR)
}

/**
 * Compact URL form: `primaryTree-keystone-row1-row2-row3_secondaryTree-runeA-runeB_shard1-shard2-shard3`,
 * with 0 for an empty pick; `undefined` when nothing is chosen, so the link stays short.
 * The separators keep it from ever parsing as JSON (the router would quote it).
 */
export function serializeRuneSelection(
	selection: RuneSelection,
): string | undefined {
	if (isRuneSelectionEmpty(selection)) return undefined
	const { primary, secondary, shardIds } = selection
	return [
		ids(
			[primary?.treeId, primary?.keystoneId, ...(primary?.runeIds ?? [])],
			2 + ROW_COUNT,
		),
		ids([secondary?.treeId, ...(secondary?.runeIds ?? [])], 3),
		ids(shardIds, ROW_COUNT),
	].join(PART_SEPARATOR)
}

function parseIds(part: string | undefined): (number | undefined)[] {
	if (!part) return []
	return part.split(ID_SEPARATOR).map((value) => {
		const id = Number(value)
		return Number.isInteger(id) && id > NONE ? id : undefined
	})
}

function findTree(runes: RunesFile, treeId: number | undefined) {
	return runes.trees.find((tree) => tree.id === treeId)
}

function inList(list: readonly { id: number }[] | undefined, id?: number) {
	return id !== undefined && !!list?.some((entry) => entry.id === id)
}

/** The row index (0 to 2) of a regular rune in `tree`, or -1. */
export function runeRowIndex(tree: RuneTree, runeId: number) {
	return tree.rows.findIndex((row) => inList(row, runeId))
}

/**
 * Reads the URL value against this patch's runes. Anything unknown or impossible is dropped,
 * never an error: an unknown tree, a rune from another row or tree, the secondary tree equal
 * to the primary one, two secondary runes in one row, a shard outside its row.
 */
export function parseRuneSelection(
	value: string | undefined,
	runes: RunesFile,
): RuneSelection {
	if (!value || !RUNES_PARAM_PATTERN.test(value)) return EMPTY_RUNE_SELECTION
	const [primaryPart, secondaryPart, shardPart] = value.split(PART_SEPARATOR)

	const [primaryTreeId, keystoneId, ...primaryRuneIds] = parseIds(primaryPart)
	const primaryTree = findTree(runes, primaryTreeId)
	const primary = primaryTree && {
		treeId: primaryTree.id,
		keystoneId: inList(primaryTree.keystones, keystoneId)
			? keystoneId
			: undefined,
		runeIds: primaryTree.rows.map((row, index) =>
			inList(row, primaryRuneIds[index]) ? primaryRuneIds[index] : undefined,
		),
	}

	const [secondaryTreeId, ...secondaryRuneIds] = parseIds(secondaryPart)
	const secondaryTree =
		secondaryTreeId !== primaryTreeId
			? findTree(runes, secondaryTreeId)
			: undefined
	const secondaryRows = new Set<number>()
	const secondary = secondaryTree && {
		treeId: secondaryTree.id,
		runeIds: secondaryRuneIds.slice(0, 2).filter((id): id is number => {
			if (id === undefined) return false
			const row = runeRowIndex(secondaryTree, id)
			if (row === -1 || secondaryRows.has(row)) return false
			secondaryRows.add(row)
			return true
		}),
	}

	const shardIds = parseIds(shardPart)
	return {
		primary,
		secondary,
		shardIds: runes.shardRows.map((row, index) => {
			const id = shardIds[index]
			return id !== undefined && row.shardIds.includes(id) ? id : undefined
		}),
	}
}

/** The chosen shards, one per filled row (a shard chosen in two rows counts twice). */
export function selectedShards(
	selection: RuneSelection,
	runes: RunesFile,
): Shard[] {
	return selection.shardIds.flatMap((id) => {
		const shard = runes.shards.find((entry) => entry.id === id)
		return shard ? [shard] : []
	})
}

/** What tells rune pages apart at a glance: the keystone and the secondary tree, when chosen. */
export function runePageHighlights(
	selection: RuneSelection,
	runes: RunesFile,
): { keystone: Rune | undefined; secondaryTree: RuneTree | undefined } {
	const primaryTree = findTree(runes, selection.primary?.treeId)
	return {
		keystone: primaryTree?.keystones.find(
			(rune) => rune.id === selection.primary?.keystoneId,
		),
		secondaryTree: findTree(runes, selection.secondary?.treeId),
	}
}
