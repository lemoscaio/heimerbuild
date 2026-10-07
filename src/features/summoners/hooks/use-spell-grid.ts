import type { SummonerSpell } from "@schemas/summoner-spell"
import { useState } from "react"
import { moveInGrid } from "@/lib/grid-navigation"

type UseSpellGridOptions = {
	spells: readonly SummonerSpell[]
	/** The slot's spell: the grid's tab stop and the first one described. */
	selectedId: string | undefined
	columns: number
}

/**
 * The picker grid's keyboard and focus: arrow keys, Home and End move focus between the spells
 * (Enter picks the focused one, as a button), and the hovered or focused spell is the described one.
 */
export function useSpellGrid({
	spells,
	selectedId,
	columns,
}: UseSpellGridOptions) {
	const [activeId, setActiveId] = useState(selectedId)
	const active = spells.find((spell) => spell.id === activeId)

	function onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
		const options = Array.from(
			event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]'),
		)
		const { target } = event
		if (!(target instanceof HTMLElement)) return
		const index = options.indexOf(target)
		if (index === -1) return
		const next = moveInGrid(index, event.key, {
			columns,
			count: options.length,
		})
		if (next === undefined) return
		event.preventDefault()
		options[next]?.focus()
	}

	return {
		/** The hovered or focused spell, else the slot's. */
		active,
		/** The one option Tab reaches; arrow keys reach the others. */
		tabStopId: selectedId ?? spells[0]?.id,
		describe: (spell: SummonerSpell) => setActiveId(spell.id),
		onKeyDown,
	}
}
