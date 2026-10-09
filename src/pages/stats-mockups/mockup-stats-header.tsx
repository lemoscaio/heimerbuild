import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import type { MockupStats } from "./lib/mockup-stats"

type MockupStatsHeaderProps = {
	/** The previewed item's name, while previewing. */
	previewLabel?: string
	/** The selected and the other form, for a champion with forms. */
	comparison?: MockupStats["compared"]
	compare: boolean
	onCompareChange: (on: boolean) => void
}

/** "Stats", the preview note and the switch that turns the form comparison on (off by default). */
export function MockupStatsHeader({
	previewLabel,
	comparison,
	compare,
	onCompareChange,
}: MockupStatsHeaderProps) {
	const switchId = useId()

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="font-bold font-display text-base">Stats</h3>
				{previewLabel && (
					<span className="truncate text-subtle text-xs">
						preview with <span className="text-lilac">{previewLabel}</span>
					</span>
				)}
			</div>
			{comparison && (
				<div className="flex min-h-9 items-center gap-2.5 text-prose text-xs">
					<Switch
						id={switchId}
						checked={compare}
						onCheckedChange={onCompareChange}
					/>
					<label htmlFor={switchId} className="cursor-pointer">
						Compare {comparison.formName} with {comparison.comparedName}
					</label>
				</div>
			)}
		</div>
	)
}
