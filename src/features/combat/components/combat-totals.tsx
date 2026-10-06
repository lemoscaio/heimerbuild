import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds, formatShare } from "../lib/combat-format"
import type { CombatTotals as Totals } from "../lib/combat-view"

type CombatTotalsProps = {
	totals: Totals
} & React.ComponentProps<"dl">

function Total({
	term,
	children,
}: {
	term: string
	children: React.ReactNode
}) {
	return (
		<div className="flex flex-col gap-0.5 rounded-lg bg-surface-sunken px-3 py-2">
			<dt className="text-subtle text-xs">{term}</dt>
			<dd className="font-bold font-display text-lg text-white tabular-nums">
				{children}
			</dd>
		</div>
	)
}

/** The combo's result: damage after mitigation, its share of the target's health, the time, the kill. */
export function CombatTotals({
	totals,
	className,
	...props
}: CombatTotalsProps) {
	return (
		<dl
			aria-label="Combo result"
			className={cn("grid grid-cols-2 gap-1.5 sm:grid-cols-4", className)}
			{...props}
		>
			<Total term="Damage">{formatDamage(totals.final)}</Total>
			<Total term="Of the target">
				<span className="text-gold">{formatShare(totals.healthShare)}</span>
			</Total>
			<Total term="Time">{formatSeconds(totals.duration)}</Total>
			<Total term="Kill">
				{totals.kill ? (
					<span className="text-health text-sm">
						At {formatSeconds(totals.kill.time)} (step {totals.kill.step + 1})
					</span>
				) : (
					<span className="text-sm">
						No · {formatDamage(totals.healthLeft)} health left
					</span>
				)}
			</Total>
		</dl>
	)
}
