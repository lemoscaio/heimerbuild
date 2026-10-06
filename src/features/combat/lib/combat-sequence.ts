import type { CombatAction } from "@/lib/combat/combat"

/** One step of the combo the user builds: an action with an id that follows it when steps move. */
export type CombatEntry = { id: number; action: CombatAction }

/** Longer combos stop adding: a fight is a few seconds of actions. */
export const MAX_COMBAT_STEPS = 30

/** A wait lasts 0.25 to 30 s, in quarter seconds; a new one lasts 1 s. */
export const WAIT_SECONDS = { min: 0.25, max: 30, step: 0.25, initial: 1 }

export function clampWaitSeconds(seconds: number): number {
	if (!Number.isFinite(seconds)) return WAIT_SECONDS.initial
	const quarters = Math.round(seconds / WAIT_SECONDS.step) * WAIT_SECONDS.step
	return Math.min(WAIT_SECONDS.max, Math.max(WAIT_SECONDS.min, quarters))
}

function nextId(entries: readonly CombatEntry[]): number {
	return Math.max(0, ...entries.map(({ id }) => id)) + 1
}

/** The combo with `action` at its end; unchanged once full. */
export function addStep(
	entries: readonly CombatEntry[],
	action: CombatAction,
): CombatEntry[] {
	if (entries.length >= MAX_COMBAT_STEPS) return [...entries]
	const added =
		action.kind === "wait"
			? { ...action, seconds: clampWaitSeconds(action.seconds) }
			: action
	return [...entries, { id: nextId(entries), action: added }]
}

export function removeStep(
	entries: readonly CombatEntry[],
	id: number,
): CombatEntry[] {
	return entries.filter((entry) => entry.id !== id)
}

/** The combo with the step `id` moved to position `to` (clamped to the list). */
export function moveStep(
	entries: readonly CombatEntry[],
	id: number,
	to: number,
): CombatEntry[] {
	const from = entries.findIndex((entry) => entry.id === id)
	const moved = entries[from]
	if (!moved) return [...entries]
	const rest = entries.filter((entry) => entry.id !== id)
	const at = Math.min(rest.length, Math.max(0, to))
	return [...rest.slice(0, at), moved, ...rest.slice(at)]
}

/** The combo with a wait's length changed; another kind of step is left alone. */
export function setWaitSeconds(
	entries: readonly CombatEntry[],
	id: number,
	seconds: number,
): CombatEntry[] {
	return entries.map((entry) =>
		entry.id === id && entry.action.kind === "wait"
			? {
					...entry,
					action: { ...entry.action, seconds: clampWaitSeconds(seconds) },
				}
			: entry,
	)
}
