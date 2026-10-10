import { useEffect, useRef, useState } from "react"
import type { CombatStartChip, CombatStartView } from "../lib/combat-start"

type UseStartStripOptions = {
	view: CombatStartView
	onReadyChange: (id: string, ready: boolean) => void
	onStacksChange: (id: string, count: number | undefined) => void
	onRunningChange: (id: string, running: boolean) => void
}

type FocusTarget = { kind: "add" } | { kind: "chip"; id: string }

/** What "+" adds: a removed cooldown back, a stacking effect at its cap, a buff running. */
export type StartAddition =
	| { kind: "ready" | "running"; id: string }
	| { kind: "stacks"; id: string; max: number }

function focusSelector(target: FocusTarget) {
	return target.kind === "add"
		? "[data-start-add]"
		: `[data-start-chip="${CSS.escape(target.id)}"]`
}

/**
 * The "Combo start" strip's actions. The focus stays on the strip as buttons come and go: × hands
 * it to "+", and a chip added from "+" takes it (once the render that shows it lands: the link
 * lags one).
 */
export function useStartStrip({
	view,
	onReadyChange,
	onStacksChange,
	onRunningChange,
}: UseStartStripOptions) {
	const strip = useRef<HTMLElement>(null)
	const [focusTarget, setFocusTarget] = useState<FocusTarget>()
	const { additions } = view

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
		hasAdditions:
			!!additions.ready.length ||
			!!additions.stacks.length ||
			!!additions.running.length,
		/** × on a chip: a cooldown starts on it, a stacking effect or a buff leaves the start. */
		remove(chip: CombatStartChip) {
			if (chip.kind === "ready") onReadyChange(chip.id, false)
			if (chip.kind === "stacks") onStacksChange(chip.id, undefined)
			if (chip.kind === "running") onRunningChange(chip.id, false)
			setFocusTarget({ kind: "add" })
		},
		/** A pick from "+": the chip appears and takes the focus. */
		add(addition: StartAddition) {
			if (addition.kind === "ready") onReadyChange(addition.id, true)
			if (addition.kind === "stacks") onStacksChange(addition.id, addition.max)
			if (addition.kind === "running") onRunningChange(addition.id, true)
			setFocusTarget({ kind: "chip", id: addition.id })
		},
	}
}
