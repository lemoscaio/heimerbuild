import type { OutcomeChoices } from "@/lib/combat/combat"
import {
	type ComboStart,
	EMPTY_COMBO_START,
	type StartStack,
} from "@/lib/combat/combo-link"
import { outcomeId } from "@/lib/combat/outcomes"
import { keepUsableStart } from "@/lib/combat/start-state"
import type { BuildEffect } from "@/lib/effects/effect"
import { type CombatEntry, removeStep } from "./combat-sequence"

/** Free mode's choices, by entry id: the outcomes the user set at that step, by `outcomeId`. */
export type FreeChoices = Readonly<Record<number, OutcomeChoices>>

/**
 * The combo the user builds: its entries (actions and markers), whether free mode is on, the
 * free mode choices, kept while it is off so toggling back and forth loses nothing, and its start:
 * the cooldowns it starts on (every other one starts ready), its starting stacks and running buffs.
 */
export type CombatState = {
	entries: readonly CombatEntry[]
	free: boolean
	choices: FreeChoices
	start: ComboStart
}

export const EMPTY_COMBAT: CombatState = {
	entries: [],
	free: false,
	choices: {},
	start: EMPTY_COMBO_START,
}

/**
 * The combo without the start of effects the build no longer has (Sheen sold, Conqueror swapped);
 * as given while the effects load. Every combo edit saves through it, so its link matches what it
 * keeps.
 */
export function dropUnusedStart(
	state: CombatState,
	effects: readonly BuildEffect[] | undefined,
	level: number,
): CombatState {
	if (!effects) return state
	const kept = keepUsableStart(state.start, effects, level)
	const same =
		kept.onCooldown.length === state.start.onCooldown.length &&
		kept.running.length === state.start.running.length &&
		kept.stacks.length === state.start.stacks.length &&
		kept.stacks.every(
			({ count }, index) => count === state.start.stacks[index]?.count,
		)
	return same ? state : { ...state, start: kept }
}

/** The combo with the effect starting on its cooldown (`onCooldown`), or ready. */
export function setStartReady(
	state: CombatState,
	effectId: string,
	ready: boolean,
): CombatState {
	const others = state.start.onCooldown.filter((id) => id !== effectId)
	return {
		...state,
		start: {
			...state.start,
			onCooldown: ready ? others : [...others, effectId],
		},
	}
}

/**
 * The combo starting with the effect at `count` stacks (kept in its place, else last), or without
 * it (`undefined`, or 0).
 */
export function setStartStacks(
	state: CombatState,
	effectId: string,
	count: number | undefined,
): CombatState {
	const { stacks } = state.start
	const next: StartStack[] = !count
		? stacks.filter(({ id }) => id !== effectId)
		: stacks.some(({ id }) => id === effectId)
			? stacks.map((stack) =>
					stack.id === effectId ? { id: effectId, count } : stack,
				)
			: [...stacks, { id: effectId, count }]
	return { ...state, start: { ...state.start, stacks: next } }
}

/** The combo starting with the buff running, or not. */
export function setStartRunning(
	state: CombatState,
	effectId: string,
	running: boolean,
): CombatState {
	const others = state.start.running.filter((id) => id !== effectId)
	return {
		...state,
		start: {
			...state.start,
			running: running ? [...others, effectId] : others,
		},
	}
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
