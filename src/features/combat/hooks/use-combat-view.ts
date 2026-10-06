import type { CombatAction, CombatTarget } from "@/lib/combat/combat"
import type { AbilityVariant } from "@/lib/combat/registries/ability-hits"
import type { BuildEffect } from "@/lib/effects/effect"
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

type UseCombatViewOptions = {
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
	variants: readonly AbilityVariant[]
}

/** A marker's line: its situation and what it did. */
export type CombatMarkerItem = {
	kind: "marker"
	id: number
	view: MarkerView
}

export type CombatListItem = CombatStepItem | CombatMarkerItem

/** The combo as its tab shows it: action cards and marker lines, and the totals. */
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
		}
	})

	return {
		items,
		totals: result && combatTotals(result, target),
	}
}
