import { NumberField } from "@/components/ui/number-field"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/cn"
import type { MatchStackSource } from "@/lib/effects/effect"
import { maxStacksOf } from "@/lib/effects/match-stacks"
import { sliderStacks, stacksFromField } from "../lib/stacks-input"

type MatchStacksInputProps = {
	source: MatchStackSource
	/** Whole stacks, 0 to the source's cap (9999 without one). */
	value: number
	onValueChange: (value: number) => void
} & Omit<React.ComponentProps<"div">, "onChange">

const NO_GROUPING = { useGrouping: false } as const

/**
 * One source's match stacks, which its effects read: a slider from 0 to the source's typical
 * late-game count (or its cap), and a box with − and + that takes any count up to 9999 (or the cap).
 */
export function MatchStacksInput({
	source,
	value,
	onValueChange,
	className,
	...props
}: MatchStacksInputProps) {
	function changeField(next: number | null) {
		const count = stacksFromField(next, source)
		if (count !== undefined) onValueChange(count)
	}

	return (
		<div className={cn("flex flex-col gap-0.5", className)} {...props}>
			<div className="flex items-center gap-1.5">
				<span className="text-subtle">Stacks</span>
				<NumberField
					label={source.name}
					min={0}
					max={maxStacksOf(source)}
					step={1}
					largeStep={10}
					format={NO_GROUPING}
					value={value}
					onValueChange={changeField}
					inputClassName="w-14"
				/>
			</div>
			<Slider
				aria-label={source.name}
				min={0}
				max={source.sliderMax}
				step={1}
				largeStep={10}
				format={NO_GROUPING}
				value={sliderStacks(value, source.sliderMax)}
				onValueChange={(next) => onValueChange(next)}
			/>
		</div>
	)
}
