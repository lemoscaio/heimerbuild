import { NumberField } from "@/components/ui/number-field"
import { cn } from "@/lib/cn"
import type { CombatStepArea } from "../hooks/use-combat-view"

type CombatAreaTimeInputProps = {
	area: CombatStepArea
	onSecondsChange: (seconds: number) => void
} & React.ComponentProps<"div">

/**
 * The seconds the target stays in the ability's area, within its range, like the target's number
 * fields, and what they deal in the step lines' muted text ("Spinning 1.5 s · 3 of 7 spins").
 * An emptied field keeps the last time.
 */
export function CombatAreaTimeInput({
	area,
	onSecondsChange,
	className,
	...props
}: CombatAreaTimeInputProps) {
	const { range, seconds, result } = area
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs",
				className,
			)}
			{...props}
		>
			<span aria-hidden="true" className="text-subtle">
				{range.label.text}
			</span>
			<NumberField
				label={`${range.label.name} in seconds`}
				min={range.min}
				max={range.max}
				step={range.step}
				value={seconds}
				onValueChange={(next) => {
					if (next !== null) onSecondsChange(next)
				}}
				className="[&_input]:w-12"
			/>
			<span aria-hidden="true" className="text-subtle">
				s
			</span>
			{result && (
				<span
					aria-live="polite"
					className="text-[0.6875rem] text-subtle tabular-nums"
				>
					<span aria-hidden="true" className="max-lg:hidden">
						·{" "}
					</span>
					{result}
				</span>
			)}
		</div>
	)
}
