import type { OutcomeChoices } from "@/lib/combat/combat"
import { outcomeId } from "@/lib/combat/outcomes"
import type { BuildEffect } from "@/lib/effects/effect"
import { type CombatEntry, removeStep } from "./combat-sequence"

/** Free mode's choices, by entry id: the outcomes the user set at that step, by `outcomeId`. */
export type FreeChoices = Readonly<Record<number, OutcomeChoices>>

/**
 * The combo the user builds: its entries (actions and markers), whether free mode is on, and the
 * free mode choices, kept while it is off so toggling back and forth loses nothing.
 */
export type CombatState = {
	entries: readonly CombatEntry[]
	free: boolean
	choices: FreeChoices
}

export const EMPTY_COMBAT: CombatState = {
	entries: [],
	free: false,
	choices: {},
}

/** The choices with one outcome set at an entry, or back to the computed one (`undefined`). */
export function setFreeChoice(
	choices: FreeChoices,
	entryId: number,
	id: string,
	happened: boolean | undefined,
): FreeChoices {
	const { [id]: _previous, ...others } = choices[entryId] ?? {}
	const entry = happened === undefined ? others : { ...others, [id]: happened }
	const { [entryId]: _entry, ...rest } = choices
	return Object.keys(entry).length ? { ...rest, [entryId]: entry } : rest
}

/** The choices in the order of the entries, as the simulator takes them. */
export function choicesByItem(
	entries: readonly CombatEntry[],
	choices: FreeChoices,
): (OutcomeChoices | undefined)[] {
	return entries.map(({ id }) => choices[id])
}

/** How many choices differ from the computed outcomes (`seed`, by item). */
export function changedChoices(
	entries: readonly CombatEntry[],
	choices: FreeChoices,
	seed: readonly OutcomeChoices[],
): number {
	return entries.reduce((count, { id }, index) => {
		const seeded = seed[index] ?? {}
		const chosen = Object.entries(choices[id] ?? {})
		return (
			count +
			chosen.filter(
				([outcome, happened]) =>
					outcome in seeded && seeded[outcome] !== happened,
			).length
		)
	}, 0)
}

/** The outcomes a marker's situation decides: the attacks its effect empowers, or its mark consumed. */
export function markerOutcomeIds({ id, effect }: BuildEffect): string[] {
	if (effect.start?.kind === "marked" && effect.applies) {
		return [outcomeId({ kind: "mark-consumed", mark: effect.applies.mark })]
	}
	return effect.trigger.kind === "on-attack"
		? [outcomeId({ kind: "empowered", effectId: id })]
		: []
}

/**
 * The combo without an entry. A marker's choices go back to the computed ones: those of its
 * outcomes on the steps after it, up to the next marker of the same effect.
 */
export function removeEntry(
	state: CombatState,
	id: number,
	effects: readonly BuildEffect[],
): CombatState {
	const index = state.entries.findIndex((entry) => entry.id === id)
	const removed = state.entries[index]
	let choices = withoutEntry(state.choices, id)
	if (removed?.action.kind === "situation") {
		const { effectId } = removed.action
		const effect = effects.find((entry) => entry.id === effectId)
		const ids = effect ? markerOutcomeIds(effect) : []
		for (const entry of state.entries.slice(index + 1)) {
			const { action } = entry
			if (action.kind === "situation" && action.effectId === effectId) break
			for (const outcome of ids) {
				choices = setFreeChoice(choices, entry.id, outcome, undefined)
			}
		}
	}
	return { ...state, entries: removeStep(state.entries, id), choices }
}

function withoutEntry(choices: FreeChoices, id: number): FreeChoices {
	const { [id]: _removed, ...rest } = choices
	return rest
}
