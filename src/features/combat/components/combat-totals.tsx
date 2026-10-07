import { cn } from "@/lib/cn"
import {
	DAMAGE_TYPE_NAMES,
	formatDamage,
	formatPartPercent,
	formatShare,
} from "../lib/combat-format"
import type { DamageTypePart, CombatTotals as Totals } from "../lib/combat-view"
import { CombatTotal } from "./combat-total"
import { damageTypeFill, damageTypeText } from "./damage-type-styles"

type CombatTotalsProps = {
	totals: Totals
	/** More figures after the damage and its share: the time and the kill (`CombatTiming`). */
	children?: React.ReactNode
} & React.ComponentProps<"dl">

/** The damage split by type: a thin stacked bar (decorative) over a legend with each amount and share. */
function DamageByType({ parts }: { parts: readonly DamageTypePart[] }) {
	return (
		<div className="col-span-full flex flex-col gap-1.5 rounded-lg bg-surface-sunken px-3 py-2">
			<dt className="text-subtle text-xs">Damage by type</dt>
			<dd className="flex flex-col gap-1.5">
				<span
					aria-hidden="true"
					className="flex h-1.5 gap-px overflow-hidden rounded-full"
				>
					{parts.map(({ type, final }) => (
						<span
							key={type}
							className={cn("basis-0", damageTypeFill(type))}
							style={{ flexGrow: final }}
						/>
					))}
				</span>
				<ul
					aria-label="Damage by type"
					className="flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums"
				>
					{parts.map(({ type, final, percent }) => (
						<li key={type} className="flex items-center gap-1.5">
							<span
								aria-hidden="true"
								className={cn("size-2 rounded-xs", damageTypeFill(type))}
							/>{" "}
							<span className={cn("font-semibold", damageTypeText(type))}>
								{formatDamage(final)} {DAMAGE_TYPE_NAMES[type]}
							</span>{" "}
							<span className="text-subtle">
								· {formatPartPercent(percent)}
							</span>
						</li>
					))}
				</ul>
			</dd>
		</div>
	)
}

/**
 * The combo's result: damage after mitigation, its share of the target's health, the given figures,
 * then the damage by type.
 */
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
				{!!totals.byType.length && <DamageByType parts={totals.byType} />}
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
