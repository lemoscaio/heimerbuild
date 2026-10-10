import { formatDamage } from "../lib/combat-format"

/** Hidden until read: what a cell's number is, as the header says it. */
function CellLabel({ children }: { children: string }) {
	return <span className="sr-only">{children} </span>
}

type CombatRowTotalsProps = {
	dealt: number
	targetHealth: number
	healthShare: number
}

/** A row's "So far" and "Target health" cells: the running total, and the health left as a short bar and its number. */
export function CombatRowTotals({
	dealt,
	targetHealth,
	healthShare,
}: CombatRowTotalsProps) {
	return (
		<>
			<span className="text-right text-prose tabular-nums [grid-area:dealt]">
				<CellLabel>So far</CellLabel>
				<span aria-hidden="true" className="@4xl:hidden text-subtle">
					so far{" "}
				</span>
				{formatDamage(dealt)}
			</span>
			<span className="flex items-center gap-2 [grid-area:health]">
				<CellLabel>Target health</CellLabel>
				<span
					aria-hidden="true"
					className="block h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-raised"
				>
					<span
						className="block h-full bg-health"
						style={{ width: `${Math.round(healthShare * 100)}%` }}
					/>
				</span>
				<span className="text-health tabular-nums">
					{formatDamage(targetHealth)}
				</span>
			</span>
		</>
	)
}
