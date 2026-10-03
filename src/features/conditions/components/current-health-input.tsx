import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/cn"
import { FULL_HEALTH, MIN_HEALTH } from "@/lib/effects/current-health"

type CurrentHealthInputProps = {
	/** Percent of maximum health, 1 to 100. */
	value: number
	onValueChange: (value: number) => void
} & Omit<React.ComponentProps<"div">, "onChange">

const PERCENT = { style: "unit", unit: "percent" } as const

/** The champion's current health, which health-dependent effects read: a slider from 100% down to 1%. */
export function CurrentHealthInput({
	value,
	onValueChange,
	className,
	...props
}: CurrentHealthInputProps) {
	return (
		<div className={cn("flex items-center gap-3", className)} {...props}>
			<span className="shrink-0 text-subtle">Health</span>
			<Slider
				aria-label="Current health"
				min={MIN_HEALTH}
				max={FULL_HEALTH}
				step={1}
				largeStep={10}
				format={PERCENT}
				value={value}
				onValueChange={(next) => onValueChange(next)}
				className="flex-1"
			/>
			<span
				aria-hidden
				className="w-9 shrink-0 text-right text-white tabular-nums"
			>
				{value}%
			</span>
		</div>
	)
}
