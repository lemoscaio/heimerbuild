import { NumberField } from "@/components/ui/number-field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { MatchStackSource } from "@/lib/effects/effect"
import { MAX_MATCH_STACKS } from "@/lib/effects/match-stacks"
import {
	pressedStackPresets,
	stacksFromField,
	stacksFromPreset,
} from "../lib/stacks-input"

type MatchStacksInputProps = {
	source: MatchStackSource
	/** Whole stacks, 0 to 9999. */
	value: number
	onValueChange: (value: number) => void
} & Omit<React.ComponentProps<"div">, "onChange">

const NO_GROUPING = { useGrouping: false } as const

/** One source's match stacks, which its effects read: a count with − and +, and the source's presets. */
export function MatchStacksInput({
	source,
	value,
	onValueChange,
	className,
	...props
}: MatchStacksInputProps) {
	function change(next: number | undefined) {
		if (next !== undefined) onValueChange(next)
	}

	return (
		<div
			className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
			{...props}
		>
			<div className="flex items-center gap-1.5">
				<span className="text-subtle">Stacks</span>
				<NumberField
					label={source.name}
					min={0}
					max={MAX_MATCH_STACKS}
					step={1}
					largeStep={10}
					format={NO_GROUPING}
					value={value}
					onValueChange={(next) => change(stacksFromField(next))}
				/>
			</div>
			<ToggleGroup
				aria-label={`${source.name} presets`}
				value={pressedStackPresets(source.presets, value)}
				onValueChange={(pressed) => change(stacksFromPreset(pressed))}
			>
				{source.presets.map((preset) => (
					<ToggleGroupItem
						key={preset}
						value={String(preset)}
						aria-label={`${preset} stacks`}
						className="h-7 min-w-8 px-2 text-xs tabular-nums"
					>
						{preset}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	)
}
