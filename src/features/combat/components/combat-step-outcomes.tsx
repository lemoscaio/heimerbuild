import type { CombatStepItem } from "../hooks/use-combat-view"
import { outcomeChoice, strictOutcomeViews } from "../lib/combat-view"
import { CombatOutcomeChips } from "./combat-outcome-chips"
import { CombatOutcomeChoices } from "./combat-outcome-choices"

/** Strict: outcomes are read-only; free: outcomes are answered per step. */
export type CombatListMode =
	| { kind: "strict" }
	| {
			kind: "free"
			onChoiceChange: (
				id: number,
				outcome: string,
				happened: boolean | undefined,
			) => void
	  }

/** A step's outcomes: read-only in strict mode, answered in free mode. */
export function CombatStepOutcomes({
	step,
	mode,
}: {
	step: Pick<CombatStepItem, "id" | "refused" | "outcomes" | "attacksOnly">
	mode: CombatListMode
}) {
	if (step.refused) return null
	if (mode.kind === "strict")
		return <CombatOutcomeChips outcomes={strictOutcomeViews(step.outcomes)} />
	return (
		<CombatOutcomeChoices
			outcomes={step.outcomes}
			note={step.attacksOnly}
			onAnswer={(id, answer) => {
				const outcome = step.outcomes.find((entry) => entry.id === id)
				if (outcome) {
					mode.onChoiceChange(step.id, id, outcomeChoice(outcome, answer))
				}
			}}
		/>
	)
}
