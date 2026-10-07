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

const SHORT_NAMES = {
	physical: "phys",
	magic: "mag",
	true: "true",
} as const satisfies Record<DamageTypePart["type"], string>

type CombatTotalsProps = {
	totals: Totals
	/** More figures after the damage and its share: the time and the kill (`CombatTiming`). */
	children?: React.ReactNode
} & React.ComponentProps<"fieldset">

/**
 * "512 physical · 200 magic · 67 true" (short names in a narrow cell), each share in its accessible
 * text, over a 2 px stacked bar.
 */
function DamageByType({ parts }: { parts: readonly DamageTypePart[] }) {
	return (
		<div className="@container flex flex-col gap-0.5">
			<ul
				aria-label="Damage by type"
				className="flex flex-wrap gap-x-1 @max-[13rem]:text-[0.625rem] text-[0.6875rem] tabular-nums leading-tight"
			>
				{parts.map(({ type, final, percent }) => (
					<li
						key={type}
						className={cn(
							"whitespace-nowrap not-last:after:text-subtle not-last:after:content-['_·']",
							damageTypeText(type),
						)}
					>
						{formatDamage(final)}{" "}
						<span aria-hidden="true" className="@[13rem]:hidden">
							{SHORT_NAMES[type]}
						</span>
						<span className="@max-[13rem]:sr-only">
							{DAMAGE_TYPE_NAMES[type]}
						</span>
						<span className="sr-only"> ({formatPartPercent(percent)})</span>
					</li>
				))}
			</ul>
			<span
				aria-hidden="true"
				className="flex h-0.5 gap-px overflow-hidden rounded-full"
			>
				{parts.map(({ type, final }) => (
					<span
						key={type}
						className={cn("basis-0", damageTypeFill(type))}
						style={{ flexGrow: final }}
					/>
				))}
			</span>
		</div>
	)
}

/** The combo's result: damage after mitigation by type, its share of the target's health, then the given figures. */
export function CombatTotals({
	totals,
	children,
	className,
	...props
}: CombatTotalsProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<fieldset
				aria-label="Combo result"
				className={cn(
					"grid grid-cols-2 gap-1.5 sm:grid-cols-[4fr_2fr_2fr_3fr]",
					className,
				)}
				{...props}
			>
				<CombatTotal
					term="Damage"
					details={
						!!totals.byType.length && <DamageByType parts={totals.byType} />
					}
				>
					{formatDamage(totals.final)}
				</CombatTotal>
				<CombatTotal term="Of the target">
					<span className="text-gold">{formatShare(totals.healthShare)}</span>
				</CombatTotal>
				{children}
			</fieldset>
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
