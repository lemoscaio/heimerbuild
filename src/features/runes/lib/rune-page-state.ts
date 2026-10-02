import type { RunesFile } from "@schemas/rune"
import {
	EMPTY_RUNE_SELECTION,
	parseRuneSelection,
	selectedShards,
	serializeRuneSelection,
} from "@/lib/rune-selection"

/**
 * The rune page a `runes` value names, checked against this patch's runes. Until they load, the
 * value stays as given so an edit elsewhere in the build does not drop it.
 */
export function readRunePage(
	value: string | undefined,
	runes: RunesFile | undefined,
) {
	if (!runes) {
		return { selection: EMPTY_RUNE_SELECTION, value, shards: [] }
	}
	const selection = parseRuneSelection(value, runes)
	return {
		selection,
		value: serializeRuneSelection(selection),
		shards: selectedShards(selection, runes),
	}
}
