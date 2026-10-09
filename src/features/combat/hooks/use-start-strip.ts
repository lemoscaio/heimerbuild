import { useEffect, useRef, useState } from "react"
import type { CombatStartChip } from "../lib/combat-start"

type UseStartStripOptions = {
	chips: readonly CombatStartChip[]
	onReadyChange: (id: string, ready: boolean) => void
}

type FocusTarget = { kind: "add-back" } | { kind: "chip"; id: string }

function focusSelector(target: FocusTarget) {
	return target.kind === "add-back"
		? "[data-start-add-back]"
		: `[data-start-chip="${CSS.escape(target.id)}"]`
}

/**
 * The "Combo start" strip's chips, split into ready and removed, and their actions. The focus stays
 * on the strip as buttons come and go: × hands it to "+", and the last chip put back takes it as
 * "+" leaves (once the render that shows it lands: the link lags one).
 */
export function useStartStrip({ chips, onReadyChange }: UseStartStripOptions) {
	const strip = useRef<HTMLElement>(null)
	const [focusTarget, setFocusTarget] = useState<FocusTarget>()
	const removed = chips.filter((chip) => !chip.ready)

	useEffect(() => {
		if (!focusTarget) return
		const element = strip.current?.querySelector<HTMLElement>(
			focusSelector(focusTarget),
		)
		if (!element) return
		element.focus()
		setFocusTarget(undefined)
	})

	return {
		strip,
		ready: chips.filter((chip) => chip.ready),
		removed,
		/** × on a chip: the effect starts on its cooldown. */
		remove(id: string) {
			onReadyChange(id, false)
			setFocusTarget({ kind: "add-back" })
		},
		/** A chip put back from "+": the effect starts ready. */
		addBack(id: string) {
			onReadyChange(id, true)
			if (removed.length === 1) setFocusTarget({ kind: "chip", id })
		},
	}
}
