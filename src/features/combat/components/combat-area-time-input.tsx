import { NumberField } from "@/components/ui/number-field"
import { cn } from "@/lib/cn"
import type { CombatStepArea } from "../hooks/use-combat-view"

type CombatAreaTimeInputProps = {
	area: CombatStepArea
	onSecondsChange: (seconds: number) => void
} & React.ComponentProps<"div">

/**
 * Blue, like a variant: the seconds the target stays in the ability's area, within its range, and
 * what they deal ("Spinning 1.5 s · 3 of 7 spins"). An emptied field keeps the last time.
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
				"flex w-fit flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-xl border border-input-line bg-input-fill py-0.5 pr-2 pl-2 text-[0.625rem] text-input-ink",
				className,
			)}
			{...props}
		>
			<span aria-hidden="true" className="whitespace-nowrap">
				{range.label.text}
			</span>
			<span className="flex items-center gap-1">
				<NumberField
					label={`${range.label.name} in seconds`}
					min={range.min}
					max={range.max}
					step={range.step}
					value={seconds}
					onValueChange={(next) => {
						if (next !== null) onSecondsChange(next)
					}}
					inputClassName="h-6 w-11 text-xs"
				/>
				<span aria-hidden="true">s</span>
			</span>
			{result && (
				<span aria-live="polite" className="font-semibold tabular-nums">
					{result}
				</span>
			)}
		</div>
	)
}
