import type { CombatStepItem } from "../hooks/use-combat-view"
import { CombatAreaTimeInput } from "./combat-area-time-input"
import { CombatVariantInput } from "./combat-variant-input"
import { CombatWaitLength } from "./combat-wait-length"

export type CombatStepInputHandlers = {
	onWaitChange: (id: number, seconds: number) => void
	onVariantChange: (id: number, variant: string) => void
	/** An ability step's seconds in its area (issue 427). */
	onInAreaChange: (id: number, seconds: number) => void
}

type CombatStepInputsProps = {
	step: Pick<
		CombatStepItem,
		"id" | "action" | "variants" | "variantsLabel" | "area"
	>
} & CombatStepInputHandlers

/** A step's inputs, in both views: a wait's length, an ability's variant and its time in the area. */
export function CombatStepInputs({
	step,
	onWaitChange,
	onVariantChange,
	onInAreaChange,
}: CombatStepInputsProps) {
	const { id, action } = step
	return (
		<>
			{action.kind === "wait" && (
				<CombatWaitLength
					seconds={action.seconds}
					onChange={(seconds) => onWaitChange(id, seconds)}
				/>
			)}
			{action.kind === "ability" && (
				<CombatVariantInput
					variants={step.variants}
					label={step.variantsLabel}
					value={action.variant}
					onValueChange={(variant) => onVariantChange(id, variant)}
				/>
			)}
			{step.area && (
				<CombatAreaTimeInput
					area={step.area}
					onSecondsChange={(seconds) => onInAreaChange(id, seconds)}
				/>
			)}
		</>
	)
}
