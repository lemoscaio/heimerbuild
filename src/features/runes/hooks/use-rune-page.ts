import type { RunesFile } from "@schemas/rune"
import {
	type RuneSelection,
	serializeRuneSelection,
} from "@/lib/rune-selection"
import { readRunePage } from "../lib/rune-page-state"

type UseRunePageOptions = {
	/** This patch's runes; undefined while they load. */
	runes: RunesFile | undefined
	/** The rune page as the `runes` value. */
	value: string | undefined
	onChange: (value: string | undefined) => void
}

export type RunePageState = ReturnType<typeof useRunePage>

/** The build's rune page, controlled by `value`: the checked page, its stat shards and the edit. */
export function useRunePage({ runes, value, onChange }: UseRunePageOptions) {
	const page = readRunePage(value, runes)

	return {
		/** The page checked against this patch's runes; empty while they load. */
		selection: page.selection,
		/** The checked `runes` value; the given one while the runes load. */
		value: page.value,
		/** The chosen stat shards, for the stats. */
		shards: page.shards,
		setSelection: (selection: RuneSelection) =>
			onChange(serializeRuneSelection(selection)),
	}
}
