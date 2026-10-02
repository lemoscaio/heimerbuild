import { useId, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useTapTooltip } from "../hooks/use-tap-tooltip"
import type { StatMatch } from "../lib/filter-items-by-stats"

const matchOptions: readonly {
	match: StatMatch
	label: string
	description: string
}[] = [
	{ match: "all", label: "AND", description: "Items with every selected stat" },
	{ match: "any", label: "OR", description: "Items with any selected stat" },
]

type StatMatchToggleProps = {
	match: StatMatch
	onMatchChange: (match: StatMatch) => void
}

/** AND / OR for the stat filters, each explained by a tooltip on hover, focus or tap. */
export function StatMatchToggle({
	match,
	onMatchChange,
}: StatMatchToggleProps) {
	const [tooltip] = useState(createTooltipHandle<string>)
	const showTooltipOnTap = useTapTooltip(tooltip)
	const idPrefix = useId()

	return (
		<ToggleGroup
			aria-label="Match selected stats"
			className="grid grid-cols-2 gap-0 rounded-sm border border-line-strong p-0.5 max-lg:grid-cols-1"
			value={[match]}
			// Pressing the selected mode again would leave none: one mode is always selected.
			onValueChange={([next]) => next && onMatchChange(next)}
		>
			{matchOptions.map(({ match: option, label, description }) => (
				<TooltipTrigger
					key={option}
					id={`${idPrefix}-${option}`}
					handle={tooltip}
					payload={description}
					closeOnClick={false}
					onPointerUp={showTooltipOnTap}
					render={
						<ToggleGroupItem
							value={option}
							aria-description={description}
							className="h-6 min-w-0 px-0 font-display font-semibold text-[0.625rem] text-white max-lg:h-11 max-lg:w-11 max-lg:text-xs"
						/>
					}
				>
					{label}
				</TooltipTrigger>
			))}
			<Tooltip handle={tooltip}>
				{({ payload }) => (
					<TooltipContent side="right">{payload}</TooltipContent>
				)}
			</Tooltip>
		</ToggleGroup>
	)
}
