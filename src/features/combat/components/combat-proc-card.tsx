import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { formatSeconds } from "../lib/combat-format"
import type { ProcRow } from "../lib/combat-rows"
import { loneProcHit, type ProcView } from "../lib/combat-view"
import { CombatDamageAmount } from "./combat-damage-amount"
import { CombatHitDamage } from "./combat-hit-damage"
import { CombatHitLine } from "./combat-hit-line"
import { CombatRunningTotal } from "./combat-running-total"

type CombatProcCardProps = {
	proc: ProcView
	/** The step that triggered it: "1. Q · Disintegrate". */
	from: string
	/** Its running total and the target's health after it, as its expanded row says them. */
	row: ProcRow
} & React.ComponentProps<"li">

/**
 * A separate instance as a row of its own among the steps, at its land time (issue 429): indented,
 * dashed and unnumbered, with no move or remove of its own. "↳ 0.80 s [icon] Arcane Comet · 40
 * magic (raw 56), from 1. Q · Disintegrate", and the running total after it.
 */
export function CombatProcCard({
	proc,
	from,
	row,
	className,
	...props
}: CombatProcCardProps) {
	const lone = loneProcHit(proc)
	return (
		<li
			className={cn(
				"ml-10 flex items-start gap-1.5 rounded-md border border-lilac/60 border-dashed bg-surface-sunken/60 px-1.5 py-1 text-[0.6875rem] text-prose",
				{ "bg-surface-raised": row.late },
				className,
			)}
			{...props}
		>
			<span aria-hidden="true" className="text-subtle">
				↳
			</span>
			<div className="flex min-w-0 flex-1 flex-col">
				<p>
					<span className="mr-2 font-bold text-white tabular-nums">
						{formatSeconds(proc.time)}
					</span>
					<GameIcon
						name={proc.name}
						src={proc.icon}
						className="mr-1 inline-flex size-3.5 rounded-xs align-[-0.2em]"
					/>
					<span className="font-semibold text-white">{proc.name}</span>
					{lone && (
						<>
							{" "}
							· <CombatHitDamage hit={lone} />
						</>
					)}
				</p>
				<p className="text-subtle">from {from}</p>
				{!lone && (
					<ul aria-label={`${proc.name} hits`} className="flex flex-col">
						{proc.hits.map((hit, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: a proc's hits never reorder
							<CombatHitLine key={index} hit={hit} />
						))}
					</ul>
				)}
				<CombatRunningTotal
					dealt={row.dealt}
					targetHealth={row.targetHealth}
					healthShare={row.healthShare}
					className="mt-0.5"
				/>
			</div>
			{proc.total.final > 0 && (
				<CombatDamageAmount
					final={proc.total.final}
					parts={proc.byType}
					size="sm"
				/>
			)}
		</li>
	)
}
