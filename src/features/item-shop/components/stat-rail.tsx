import { useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { shopStatGroups } from "../lib/shop-stats"

type StatRailProps = {
	stats: readonly StatKey[]
	onStatsChange: (stats: StatKey[]) => void
	/** Above the icons: the AND/OR switch. */
	children?: React.ReactNode
} & React.ComponentProps<"div">

/** The stat filter as a rail of icon toggles, grouped Offense / Defense / Utility. */
export function StatRail({
	stats,
	onStatsChange,
	children,
	className,
	...props
}: StatRailProps) {
	// One tooltip for all 23 icons; each trigger passes its stat name.
	const [tooltip] = useState(createTooltipHandle<string>)

	return (
		<div className={cn("flex w-max flex-col gap-2", className)} {...props}>
			{children}
			<ToggleGroup
				multiple
				orientation="vertical"
				aria-label="Filter by stat"
				className="items-stretch gap-2"
				value={stats}
				onValueChange={onStatsChange}
			>
				{shopStatGroups.map(({ group, label, stats: groupStats }) => (
					<fieldset
						key={group}
						aria-label={label}
						className="grid min-w-0 grid-cols-1 gap-1 border-primary-2 border-t pt-2 lg:grid-cols-2"
					>
						{groupStats.map(({ stat, label: statLabel, icon }) => (
							<TooltipTrigger
								key={stat}
								handle={tooltip}
								payload={statLabel}
								render={
									<ToggleGroupItem
										value={stat}
										aria-label={statLabel}
										className="size-9 p-1.5 data-pressed:inset-ring-gold data-pressed:bg-primary-2 max-lg:size-11 max-lg:p-2"
									/>
								}
							>
								<img
									src={icon}
									alt=""
									className="size-full opacity-70 transition-opacity group-hover/toggle:opacity-100 group-data-pressed/toggle:opacity-100"
								/>
							</TooltipTrigger>
						))}
					</fieldset>
				))}
			</ToggleGroup>
			<Tooltip handle={tooltip}>
				{({ payload }) => (
					<TooltipContent side="right">{payload}</TooltipContent>
				)}
			</Tooltip>
		</div>
	)
}
