import { cn } from "@/lib/cn"
import { formatDamage, formatShare } from "../lib/combat-format"
import type { CombatTotals as Totals } from "../lib/combat-view"
import { CombatTotal } from "./combat-total"

type CombatTotalsProps = {
	totals: Totals
	/** More figures after the damage and its share: the time and the kill (`CombatTiming`). */
	children?: React.ReactNode
} & React.ComponentProps<"dl">

/** The combo's result: damage after mitigation, its share of the target's health, then the given figures. */
export function CombatTotals({
	totals,
	children,
	className,
	...props
}: CombatTotalsProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<dl
				aria-label="Combo result"
				className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4", className)}
				{...props}
			>
				<CombatTotal term="Damage">{formatDamage(totals.final)}</CombatTotal>
				<CombatTotal term="Of the target">
					<span className="text-gold">{formatShare(totals.healthShare)}</span>
				</CombatTotal>
				{children}
			</dl>
			{!!totals.forcedMarkers && (
				<p className="w-fit rounded-full border border-forced px-2 py-0.5 text-forced text-xs">
					{totals.forcedMarkers === 1
						? "1 forced marker"
						: `${totals.forcedMarkers} forced markers`}
				</p>
			)}
		</div>
	)
}
