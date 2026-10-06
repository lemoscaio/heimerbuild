import { useId } from "react"
import { NumberField } from "@/components/ui/number-field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { Target } from "../hooks/use-target"
import { TARGET_STAT_RANGES, type TargetStat } from "../lib/target"

const STAT_FIELDS = [
	{ stat: "health", label: "Health", short: "HP", step: 50 },
	{ stat: "armor", label: "Armor", short: "Armor", step: 5 },
	{ stat: "magicResist", label: "Magic resist", short: "MR", step: 5 },
] as const satisfies readonly {
	stat: TargetStat
	label: string
	short: string
	step: number
}[]

type TargetEditorProps = {
	target: Target
} & React.ComponentProps<"section">

/** The combo's target: a preset, or its health, armor and magic resist set one by one. */
export function TargetEditor({
	target,
	className,
	...props
}: TargetEditorProps) {
	const titleId = useId()
	// A pressed preset clicked again stays pressed; editing a number leaves every preset unpressed.
	function pickPreset([id]: string[]) {
		const preset = target.presets.find((entry) => entry.id === id)
		if (preset) target.setPreset(preset.id)
	}
	// An emptied field keeps the last number.
	function changeStat(stat: TargetStat, next: number | null) {
		if (next !== null) target.setStat(stat, next)
	}

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-2", className)}
			{...props}
		>
			<div className="flex items-baseline justify-between gap-2">
				<h3 id={titleId} className="font-bold font-display text-sm">
					Target
				</h3>
				<span className="text-subtle text-xs">
					A dummy that doesn't fight back
				</span>
			</div>
			<ToggleGroup
				aria-label="Target presets"
				value={target.preset ? [target.preset.id] : []}
				onValueChange={pickPreset}
				className="flex-wrap"
			>
				{target.presets.map((preset) => (
					<ToggleGroupItem
						key={preset.id}
						value={preset.id}
						className="h-7 px-2.5 text-xs"
					>
						{preset.name}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			<div className="flex flex-wrap gap-x-4 gap-y-2">
				{STAT_FIELDS.map(({ stat, label, short, step }) => (
					<div key={stat} className="flex items-center gap-1.5 text-xs">
						<span aria-hidden className="text-subtle">
							{short}
						</span>
						<NumberField
							label={`Target ${label.toLowerCase()}`}
							min={TARGET_STAT_RANGES[stat].min}
							max={TARGET_STAT_RANGES[stat].max}
							step={step}
							value={target.target[stat]}
							onValueChange={(next) => changeStat(stat, next)}
							className="[&_input]:w-14"
						/>
					</div>
				))}
			</div>
		</section>
	)
}
