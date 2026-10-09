import { cva } from "class-variance-authority"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { formatDamage, formatSeconds } from "../lib/combat-format"
import { loneProcHit, type ProcView } from "../lib/combat-view"
import { CombatHitDamage } from "./combat-hit-damage"
import { CombatHitLine } from "./combat-hit-line"
import { damageTypeText } from "./damage-type-styles"

/** Dashed, so it never reads as a step: inside its step's card, or indented among the steps. */
const procCard = cva(
	"flex items-start gap-1.5 rounded-md border border-lilac/60 border-dashed px-1.5 py-1",
	{
		variants: {
			place: {
				inside: "",
				outside: "ml-10 bg-surface-sunken/60 text-[0.6875rem] text-prose",
			},
		},
	},
)

type CombatProcCardProps = {
	proc: ProcView
	/** PROTOTYPE (PR 434): the step that triggered it, for a proc listed among the steps ("1. Q · Disintegrate"). */
	from?: string
} & React.ComponentProps<"li">

/** A separate instance (issue 429): "↳ 0.80 s [icon] Arcane Comet · 40 magic (raw 56)   40". */
export function CombatProcCard({
	proc,
	from,
	className,
	...props
}: CombatProcCardProps) {
	const lone = loneProcHit(proc)
	return (
		<li
			className={cn(
				procCard({ place: from ? "outside" : "inside" }),
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
				{from && <p className="text-subtle">from {from}</p>}
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
