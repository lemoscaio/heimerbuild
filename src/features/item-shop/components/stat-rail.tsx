import { useState } from "react"
import { Toggle } from "@/components/ui/toggle"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { useRovingFocus } from "../hooks/use-roving-focus"
import { shopStatGroups } from "../lib/shop-stats"

const railStats = shopStatGroups.flatMap(({ stats }) =>
	stats.map(({ stat }) => stat),
)

type StatTip = { label: string; alias: string }

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
	// One tooltip for all 23 icons; each trigger passes its stat name and search alias.
	const [tooltip] = useState(createTooltipHandle<StatTip>)
	// One Tab stop; arrows move across the two columns and rows, as in the item grid.
	const { containerRef, handleKeyDown, getItemProps } =
		useRovingFocus(railStats)

	function toggle(stat: StatKey, pressed: boolean) {
		onStatsChange(
			pressed ? [...stats, stat] : stats.filter((other) => other !== stat),
		)
	}

	return (
		<div className={cn("flex w-max flex-col gap-2", className)} {...props}>
			{children}
			<fieldset
				ref={containerRef}
				aria-label="Filter by stat"
				className="flex min-w-0 flex-col gap-1.5"
				onKeyDown={handleKeyDown}
			>
				{shopStatGroups.map(({ group, label, stats: groupStats }) => (
					<fieldset
						key={group}
						aria-label={label}
						className="grid min-w-0 grid-cols-1 gap-0.5 border-primary-2 border-t pt-1.5 lg:grid-cols-2"
					>
						{groupStats.map(({ stat, label: statLabel, icon, aliases }) => (
							<TooltipTrigger
								key={stat}
								handle={tooltip}
								payload={{ label: statLabel, alias: aliases[0] }}
								render={
									<Toggle
										aria-label={statLabel}
										pressed={stats.includes(stat)}
										onPressedChange={(pressed) => toggle(stat, pressed)}
										className="size-8 min-w-0 p-0 data-pressed:inset-ring-gold data-pressed:bg-primary-2 max-lg:size-11"
										{...getItemProps(stat)}
									/>
								}
							>
								<img
									src={icon}
									alt=""
									className="size-4.5 opacity-70 transition-opacity group-hover/toggle:opacity-100 group-data-pressed/toggle:opacity-100"
								/>
							</TooltipTrigger>
						))}
					</fieldset>
				))}
			</fieldset>
			<Tooltip handle={tooltip}>
				{({ payload }) => (
					<TooltipContent side="right">
						<span className="font-semibold">{payload?.label}</span>
						<span className="text-subtle">
							{" "}
							· type{" "}
							<kbd className="font-mono text-white">{payload?.alias}</kbd>
						</span>
					</TooltipContent>
				)}
			</Tooltip>
		</div>
	)
}
