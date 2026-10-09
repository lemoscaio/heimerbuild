import type { AbilitySlot } from "@schemas/champion"
import { type CombatItem, MAX_COMBAT_STEPS } from "@/lib/combat/combat"
import {
	type AbilityVariant,
	areaSeconds,
	defaultVariant,
	type TimeInArea,
} from "@/lib/combat/registries/ability-hits"

/**
 * One entry of the combo the user builds: an action or a situation marker, with an id that follows
 * it when entries move.
 */
export type CombatEntry = { id: number; action: CombatItem }

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

/** The combo with `action` at position `at` (clamped: 0 is the start); unchanged once full. */
export function insertStep(
	entries: readonly CombatEntry[],
	action: CombatItem,
	at: number,
): CombatEntry[] {
	if (entries.length >= MAX_COMBAT_STEPS) return [...entries]
	const added =
		action.kind === "wait"
			? { ...action, seconds: clampWaitSeconds(action.seconds) }
			: action
	const index = Math.min(entries.length, Math.max(0, at))
	return entries.toSpliced(index, 0, { id: nextId(entries), action: added })
}

/** The combo with `action` at its end; unchanged once full. */
export function addStep(
	entries: readonly CombatEntry[],
	action: CombatItem,
): CombatEntry[] {
	return insertStep(entries, action, entries.length)
}

export function removeStep(
	entries: readonly CombatEntry[],
	id: number,
): CombatEntry[] {
	return entries.filter((entry) => entry.id !== id)
}

/** The combo with the entries `ids`, kept together in their order, moved to position `to` (clamped). */
export function moveEntries(
	entries: readonly CombatEntry[],
	ids: readonly number[],
	to: number,
): CombatEntry[] {
	const moving = new Set(ids)
	const moved = entries.filter((entry) => moving.has(entry.id))
	const rest = entries.filter((entry) => !moving.has(entry.id))
	const at = Math.min(rest.length, Math.max(0, to))
	return [...rest.slice(0, at), ...moved, ...rest.slice(at)]
}

/** A move of a block of entries: where its entries go and its new place among its siblings. */
export type BlockMove = { ids: readonly number[]; to: number; position: number }

/**
 * Moving the block at `position` among `blocks` (the list as it shows: a step, a marker or a whole
 * group) one place up or down, past its whole neighbour, or to the first place (`start`). None at
 * the list's edge.
 */
export function blockMove(
	entryIds: readonly number[],
	blocks: readonly (readonly number[])[],
	{
		position,
		direction,
	}: { position: number; direction: "up" | "down" | "start" },
): BlockMove | undefined {
	const block = blocks[position]
	if (direction === "start") {
		const first = blocks[0]?.[0]
		if (!block || position === 0 || first === undefined) return undefined
		return { ids: block, to: entryIds.indexOf(first), position: 0 }
	}
	const neighbour = blocks[direction === "up" ? position - 1 : position + 1]
	const start = block?.[0] === undefined ? -1 : entryIds.indexOf(block[0])
	if (!block || !neighbour || start === -1) return undefined
	return direction === "up"
		? { ids: block, to: start - neighbour.length, position: position - 1 }
		: { ids: block, to: start + neighbour.length, position: position + 1 }
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

/**
 * The combo with an ability step's variant picked (Decimate's inner handle); its default is saved as
 * no pick, so the link omits it (`r` is Pyroclasm's 3 hits). Other steps are left alone.
 */
export function setStepVariant(
	entries: readonly CombatEntry[],
	id: number,
	variant: string,
	variantsOf: (slot: AbilitySlot) => readonly AbilityVariant[],
): CombatEntry[] {
	return entries.map((entry) => {
		if (entry.id !== id || entry.action.kind !== "ability") return entry
		const { variant: _picked, ...action } = entry.action
		const isDefault = defaultVariant(variantsOf(action.slot))?.id === variant
		return { ...entry, action: isDefault ? action : { ...action, variant } }
	})
}

/**
 * The combo with an ability step's time in the area set (issue 427), on its range's steps and
 * within it; the full time is saved as none, so the link omits it. Other steps are left alone.
 */
export function setStepInArea(
	entries: readonly CombatEntry[],
	id: number,
	seconds: number,
	timeInAreaOf: (slot: AbilitySlot) => TimeInArea | undefined,
): CombatEntry[] {
	return entries.map((entry) => {
		if (entry.id !== id || entry.action.kind !== "ability") return entry
		const { inArea: _picked, ...action } = entry.action
		const range = timeInAreaOf(action.slot)
		if (!range) return entry
		const inArea = areaSeconds(range, seconds)
		return {
			...entry,
			action: inArea === range.max ? action : { ...action, inArea },
		}
	})
}
