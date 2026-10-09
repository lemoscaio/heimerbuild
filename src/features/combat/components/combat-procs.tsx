import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import { loneProcHit, type ProcView } from "../lib/combat-view"
import { CombatHitDamage } from "./combat-hit-damage"
import { CombatHitLine } from "./combat-hit-line"
import { damageTypeText } from "./damage-type-styles"

/** A separate instance under its step: "↳ 0.80 s [icon] Arcane Comet · 40 magic (raw 56)   40". */
function ProcCard({ proc }: { proc: ProcView }) {
	const lone = loneProcHit(proc)
	return (
		<li className="flex items-start gap-1.5 rounded-md border border-lilac/60 border-dashed px-1.5 py-1">
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
				{!lone && (
					<ul aria-label={`${proc.name} hits`} className="flex flex-col">
						{proc.hits.map((hit, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: a proc's hits never reorder
							<CombatHitLine key={index} hit={hit} />
						))}
					</ul>
				)}
			</div>
			{proc.total.final > 0 && (
				<span
					className={cn(
						"font-bold font-display text-sm tabular-nums",
						proc.mainType && damageTypeText(proc.mainType),
					)}
				>
					{formatDamage(proc.total.final)}
				</span>
			)}
		</li>
	)
}

/**
 * The separate instances a step triggered (issue 429), as mini cards under its hits: each with its
 * rune or item icon and when it landed. They are no steps: no move or remove of their own.
 */
export function CombatProcs({ procs }: { procs: readonly ProcView[] }) {
	return (
		<ul
			aria-label="Procs"
			className="flex flex-col gap-1 text-[0.6875rem] text-prose"
		>
			{procs.map((proc) => (
				<ProcCard key={`${proc.effectId}@${proc.time}`} proc={proc} />
			))}
		</ul>
	)
}
