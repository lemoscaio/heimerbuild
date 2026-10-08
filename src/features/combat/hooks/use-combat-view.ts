import type { AreaVariant } from "@/lib/combat/area-ticks"
import type { CombatAction, CombatTarget } from "@/lib/combat/combat"
import {
	defaultVariant,
	LANDS_LABEL,
	type VariantsLabel,
} from "@/lib/combat/registries/ability-hits"
import type { BuildEffect } from "@/lib/effects/effect"
import {
	actionKey,
	type GroupView,
	groupRuns,
	groupView,
} from "../lib/combat-groups"
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
	type StepView,
	stepView,
} from "../lib/combat-view"
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
	outcomes: OutcomeView[]
	/** Free mode: the outcomes only attacks have, said on an ability's card. */
	attacksOnly?: string
	/** The ways the ability can land, with the one picked (Decimate's outer blade). */
	variants: readonly AreaVariant[]
	/** What the variants pick ("Lands", "Poisoned"). */
	variantsLabel: VariantsLabel
}

/** A marker's line: its situation and what it did. */
export type CombatMarkerItem = {
	kind: "marker"
	id: number
	view: MarkerView
}

export type CombatListItem = CombatStepItem | CombatMarkerItem

/** A run of identical steps shown as one block, its steps listed on demand (issue 331). */
export type CombatGroupItem = {
	kind: "group"
	/** Its smallest entry id: it stays while its steps move inside it. */
	id: number
	action: CombatAction
	steps: CombatStepItem[]
	/** Its first and last steps' numbers among the actions. */
	numbers: { first: number; last: number }
	view: GroupView
}

/** An item of the list as it shows: a step, a marker or a group. */
export type CombatShownItem = CombatListItem | CombatGroupItem

/** A step's identity for grouping, its ability variant read as the default one when none is picked. */
function groupKey(item: CombatListItem) {
	if (item.kind === "marker") return undefined
	const { action } = item
	return actionKey(
		action.kind === "ability"
			? {
					...action,
					variant: action.variant ?? defaultVariant(item.variants)?.id,
				}
			: action,
	)
}

/** The list with each run of identical steps as one group (`groupRuns`), summed up by `groupView`. */
function shownItems(items: readonly CombatListItem[]): CombatShownItem[] {
	return groupRuns(items, groupKey).map((run): CombatShownItem => {
		if (run.kind === "single") return run.item
		const steps = run.items.filter(
			(item): item is CombatStepItem => item.kind === "step",
		)
		const [first] = steps
		const last = steps.at(-1)
		if (!first || !last) throw new Error("A group always has steps")
		return {
			kind: "group",
			id: Math.min(...steps.map(({ id }) => id)),
			action: first.action,
			steps,
			numbers: { first: first.number, last: last.number },
			view: groupView(steps),
		}
	})
}

/** The combo as its tab shows it: action cards, marker lines and groups of identical steps, and the totals. */
export function useCombatView({
	combat,
	target,
	effects,
	passiveName,
}: UseCombatViewOptions) {
	const names = combatNames({ passiveName, spells: combat.spells, effects })
	const { result, seed, free, entries } = combat
	const numbers = actionNumbers(entries)
	const firstAction = numbers.findIndex((number) => number !== undefined)
	const effectById = new Map(effects.map((effect) => [effect.id, effect]))

	const items = entries.map((entry, index): CombatListItem => {
		const step = result?.steps[index]
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
					...(effect?.effect.start && { kind: effect.effect.start.kind }),
				}),
			}
		}
		const outcomes = step?.outcomes ?? []
		return {
			kind: "step",
			id: entry.id,
			action,
			number: numbers[index] ?? 0,
			time: step?.time,
			refused: step?.refused,
			view: step && stepView(step, { names, target }),
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
		}
	})

	return {
		items: shownItems(items),
		/** The same entries in the combo's order, ungrouped. */
		list: items,
		totals: result && combatTotals(result, target),
	}
}
