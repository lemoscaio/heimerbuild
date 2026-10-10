import type {
	CombatAction,
	CombatStep,
	CombatTarget,
} from "@/lib/combat/combat"
import {
	type AbilityVariant,
	areaSeconds,
	defaultVariant,
	LANDS_LABEL,
	type TimeInArea,
	type VariantsLabel,
} from "@/lib/combat/registries/ability-hits"
import type { BuildEffect } from "@/lib/effects/effect"
import { formatAreaResult } from "../lib/combat-format"
import {
	actionKey,
	type GroupTiming,
	type GroupView,
	groupRuns,
	groupTiming,
	groupView,
} from "../lib/combat-groups"
import { type CombatRowView, combatRowViews } from "../lib/combat-row-views"
import type { CombatRow, CombatRowOrder, ProcRow } from "../lib/combat-rows"
import { situationLabel } from "../lib/combat-situations"
import {
	actionNumbers,
	attacksOnlyNote,
	combatNames,
	combatTotals,
	type MarkerView,
	markerView,
	type OutcomeView,
	outcomeViews,
	type ProcView,
	type StepView,
} from "../lib/combat-view"
import { effectsById } from "../lib/hit-placement"
import type { Combat } from "./use-combat"

export type UseCombatViewOptions = {
	combat: Combat
	target: CombatTarget
	effects: readonly BuildEffect[]
	passiveName: string
}

/** An action's card: its number among the actions, what it did, its outcomes and its input. */
export type CombatStepItem = {
	kind: "step"
	id: number
	action: CombatAction
	number: number
	time?: number
	refused?: string
	view?: StepView
	/** When it starts and lands, the running total and the target's health (`combatRows`); absent while the build loads. */
	row?: CombatRow
	outcomes: OutcomeView[]
	/** Free mode: the outcomes only attacks have, said on an ability's card. */
	attacksOnly?: string
	/** The ways the ability can land, with the one picked (Decimate's outer blade). */
	variants: readonly AbilityVariant[]
	/** What the variants pick ("Lands", "Hits"). */
	variantsLabel: VariantsLabel
	/** The time the target stays in the ability's area, when it has one (issue 427). */
	area?: CombatStepArea
}

/** A step's time in the area: its range, the seconds it runs and what they deal ("4 of 7 spins", "3 ticks"). */
export type CombatStepArea = {
	range: TimeInArea
	seconds: number
	/** What its seconds deal, said beside them; absent when the step was refused. */
	result?: string
}

/** A marker's line: its situation and what it did. */
export type CombatMarkerItem = {
	kind: "marker"
	id: number
	view: MarkerView
}

export type CombatListItem = CombatStepItem | CombatMarkerItem

/** A proc as an entry of its own among the steps, at its land time (issue 429), with the step that triggered it. */
export type CombatProcItem = {
	kind: "proc"
	key: string
	proc: ProcView
	row: ProcRow
	from: CombatStepItem
}

/** A run of identical steps shown as one block (issue 331), its steps and their procs listed on demand. */
export type CombatGroupItem = {
	kind: "group"
	/** Its smallest entry id: it stays while its steps move inside it. */
	id: number
	action: CombatAction
	steps: CombatStepItem[]
	/** Its steps and the procs that land among them, as they show once it opens. */
	entries: (CombatStepItem | CombatProcItem)[]
	/** Its first and last steps' numbers among the actions. */
	numbers: { first: number; last: number }
	view: GroupView
	/** When it starts and lands, and the running total after it; absent while the build loads. */
	timing?: GroupTiming
}

/** An entry of the combo as both views show it: a step, a marker, a proc or a group. */
export type CombatShownItem = CombatListItem | CombatProcItem | CombatGroupItem

/** A step's identity for grouping, its ability variant read as the default one when none is picked. */
function groupKey(item: CombatShownItem) {
	if (item.kind !== "step") return undefined
	const { action } = item
	return actionKey(
		action.kind === "ability"
			? {
					...action,
					variant: action.variant ?? defaultVariant(item.variants)?.id,
					inArea: item.area?.seconds,
				}
			: action,
	)
}

/** An ability step's time in its area and what it deals, when its ability has one. */
function stepArea(
	combat: Combat,
	action: Extract<CombatAction, { kind: "ability" }>,
	step: CombatStep | undefined,
): CombatStepArea | undefined {
	const range = combat.timeInArea(action.slot)
	if (!range) return undefined
	const seconds = areaSeconds(range, action.inArea)
	const result =
		step &&
		!step.refused &&
		formatAreaResult({
			hits: step.hits,
			ticks: combat.areaTicks(action.slot, seconds),
			hitsName: range.hitsName,
		})
	return { range, seconds, ...(result && { result }) }
}

/** The rows as the list's entries: steps and markers from the list, each proc with its step. */
function rowEntries(
	rows: readonly CombatRowView[],
	list: readonly CombatListItem[],
): CombatShownItem[] {
	return rows.flatMap((entry): CombatShownItem[] => {
		const item = list[entry.row.index]
		if (entry.kind === "step") return item ? [item] : []
		if (item?.kind !== "step") return []
		const { row, view: proc } = entry
		const key = `${item.id}:${proc.effectId}@${proc.time}`
		return [{ kind: "proc", key, proc, row, from: item }]
	})
}

/** A group's steps with only the procs it holds, which its totals add up. */
function heldProcs(
	steps: readonly CombatStepItem[],
	procs: readonly CombatProcItem[],
) {
	const held = new Set(procs.map(({ proc }) => proc))
	return steps.map((step) =>
		step.view
			? {
					...step,
					view: {
						...step.view,
						procs: step.view.procs.filter((proc) => held.has(proc)),
					},
				}
			: step,
	)
}

/** A run of identical steps as one group, summed up by `groupView`, timed by `groupTiming`. */
function groupItem(entries: CombatGroupItem["entries"]): CombatGroupItem {
	const steps = entries.filter(
		(item): item is CombatStepItem => item.kind === "step",
	)
	const procs = entries.filter(
		(item): item is CombatProcItem => item.kind === "proc",
	)
	const [first] = steps
	const last = steps.at(-1)
	if (!first || !last) throw new Error("A group always has steps")
	const rows = steps.flatMap(({ row }) => (row ? [row] : []))
	const end = entries.at(-1)?.row
	const timing = end && groupTiming(rows, end)
	return {
		kind: "group",
		id: Math.min(...steps.map(({ id }) => id)),
		action: first.action,
		steps,
		entries,
		numbers: { first: first.number, last: last.number },
		view: groupView(heldProcs(steps, procs)),
		...(timing && { timing }),
	}
}

/** The entries with each run of identical steps as one group (`groupRuns`, issue 331). */
function shownItems(entries: readonly CombatShownItem[]): CombatShownItem[] {
	return groupRuns(entries, {
		key: groupKey,
		indexOf: (item) => (item.kind === "step" ? item.row?.index : undefined),
		ownerOf: (item) => (item.kind === "proc" ? item.row.index : undefined),
	}).map((run) => {
		if (run.kind === "single") return run.item
		return groupItem(
			run.items.filter(
				(item): item is CombatStepItem | CombatProcItem =>
					item.kind === "step" || item.kind === "proc",
			),
		)
	})
}

type UseCombatListOptions = UseCombatViewOptions & {
	/** The rows' order, which the running total follows. */
	order: CombatRowOrder
}

/**
 * The combo as both its views show it (issue 405): one entry per step and marker, each proc an entry
 * of its own at its land time, runs of identical steps as groups, in hit order or the combo's
 * order, the running total down the entries; and the totals.
 */
export function useCombatView({
	combat,
	target,
	effects,
	passiveName,
	order,
}: UseCombatListOptions) {
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const { result, seed, free, entries } = combat
	const numbers = actionNumbers(entries)
	const firstAction = numbers.findIndex((number) => number !== undefined)
	const effectById = effectsById(effects)
	// The rows the expanded combo shows: each hit on the step that triggered it (issue 429), its health the row's.
	const rows = result
		? combatRowViews(result, {
				target,
				effects: effectById,
				names,
				order,
			})
		: []
	const byIndex = new Map(
		rows.flatMap((entry) =>
			entry.kind === "step" ? [[entry.row.index, entry]] : [],
		),
	)

	const list = entries.map((entry, index): CombatListItem => {
		const shown = byIndex.get(index)
		const step = shown?.row.step
		const { action } = entry
		if (action.kind === "situation") {
			const effect = effectById.get(action.effectId)
			return {
				kind: "marker",
				id: entry.id,
				view: markerView(step ?? {}, {
					label: effect ? situationLabel(effect) : action.effectId,
					atStart: firstAction === -1 || index < firstAction,
					free,
				}),
			}
		}
		const outcomes = step?.outcomes ?? []
		const area = action.kind === "ability" && stepArea(combat, action, step)
		return {
			kind: "step",
			id: entry.id,
			action,
			number: numbers[index] ?? 0,
			time: step?.time,
			refused: step?.refused,
			...(shown && { view: shown.view, row: shown.row }),
			outcomes: outcomeViews(outcomes, { names, seed: seed?.[index] }),
			...(free &&
				action.kind === "ability" && {
					attacksOnly: attacksOnlyNote(outcomes, combat.attackOutcomes, names),
				}),
			variants: action.kind === "ability" ? combat.variants(action.slot) : [],
			variantsLabel:
				action.kind === "ability"
					? combat.variantsLabel(action.slot)
					: LANDS_LABEL,
			...(area && { area }),
		}
	})

	return {
		items: shownItems(result ? rowEntries(rows, list) : list),
		/** The same entries in the combo's order, ungrouped, which the moves follow. */
		list,
		totals: result && combatTotals(result, target),
	}
}
