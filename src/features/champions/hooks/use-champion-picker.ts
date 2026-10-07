import type { ChampionSummary } from "@schemas/champion"
import { useId, useState } from "react"
import { filterChampions } from "@/lib/filter-champions"
import { moveInGrid } from "@/lib/grid-navigation"

const GRID_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])

type UseChampionPickerOptions = {
	champions: ChampionSummary[] | undefined
	/** The build's champion, left out of the grid. */
	currentKey: string
	/** Options per row, for the arrow keys. */
	columns: number
	onPick: (championKey: string) => void
}

/**
 * The picker's search and keyboard: typing filters like the home page search, the arrow keys move
 * the active champion in the grid while the search field keeps the focus, and Enter picks it.
 */
export function useChampionPicker({
	champions,
	currentKey,
	columns,
	onPick,
}: UseChampionPickerOptions) {
	const idPrefix = useId()
	const [search, setSearch] = useState("")
	const [activeIndex, setActiveIndex] = useState(0)
	const options = filterChampions(champions ?? [], search).filter(
		(champion) => champion.key !== currentKey,
	)
	const index = Math.min(activeIndex, options.length - 1)
	const active = options[index]

	function optionId(championKey: string) {
		return `${idPrefix}-${championKey}`
	}

	function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			if (!active) return
			event.preventDefault()
			onPick(active.key)
			return
		}
		if (!GRID_KEYS.has(event.key) || !options.length) return
		const next = moveInGrid(index, event.key, {
			columns,
			count: options.length,
		})
		const option = next === undefined ? undefined : options[next]
		if (next === undefined || !option) return
		event.preventDefault()
		setActiveIndex(next)
		document
			.getElementById(optionId(option.key))
			?.scrollIntoView({ block: "nearest" })
	}

	return {
		search,
		/** A new search starts again from the first match. */
		setSearch(next: string) {
			setSearch(next)
			setActiveIndex(0)
		},
		/** The champions offered: the search's matches, the build's champion left out. */
		options,
		/** The champion Enter picks, highlighted in the grid. */
		activeKey: active?.key,
		activate: setActiveIndex,
		optionId,
		onKeyDown,
	}
}
