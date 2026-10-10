import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
import { cn } from "@/lib/cn"
import type { GroupTiming, GroupView } from "../lib/combat-groups"
import { CombatDamageAmount } from "./combat-damage-amount"
import { CombatDamageSubline } from "./combat-damage-subline"
import { CombatGroupSummary } from "./combat-group-summary"
import { CombatGroupToggle } from "./combat-group-toggle"
import { CombatLandTime } from "./combat-land-time"
import { CombatRowStarts } from "./combat-row-starts"
import { CombatRowTotals } from "./combat-row-totals"
import { STEP_ROW_GRID } from "./combat-step-row"

/** Highlighted when one of its steps lands after the next step started, like a step's row. */
const header = cva(cn(STEP_ROW_GRID, "items-start px-4 py-2.5 text-xs"), {
	variants: {
		timing: { late: "bg-surface-raised", onTime: "" },
	},
})

type CombatStepGroupRowProps = {
	/** "4–6. Attack ×3" */
	title: string
	icon: React.ReactNode
	view: GroupView
	/** When it starts and lands, and the running total after it; absent while the build loads. */
	timing?: GroupTiming
	/** Free mode's answers inside that differ from the computed ones; none outside free mode. */
	changes?: number
	/** The group's "Move up" and "Move down" buttons (`CombatMoveButtons`). */
	moves: React.ReactNode
	open: boolean
	onOpenChange: (open: boolean) => void
	onRemove: () => void
	/** Its steps' rows and their procs, shown once open. */
	children: React.ReactNode
} & React.ComponentProps<"li">

/**
 * A run of identical steps as one row of the expanded combo, as the Combo tab's group card has it
 * (issue 405): when its hits land and when it starts, its counts, its damage, the running total
 * and the target's health after it. It moves and goes as a whole; "Show steps" lists its rows.
 */
export function CombatStepGroupRow({
	title,
	icon,
	view,
	timing,
	changes,
	moves,
	open,
	onOpenChange,
	onRemove,
	children,
	className,
	...props
}: CombatStepGroupRowProps) {
	return (
		<li
			className={cn(
				"border-line border-b shadow-[inset_3px_0_0_var(--color-lilac)]",
				className,
			)}
			{...props}
		>
			<Collapsible open={open} onOpenChange={onOpenChange}>
				<div className={header({ timing: timing?.late ? "late" : "onTime" })}>
					<div className="[grid-area:moves]">{moves}</div>
					{timing && (
						<>
							<span className="pt-0.5 text-white [grid-area:lands]">
								<CombatLandTime lands={timing.lands} />
							</span>
							<CombatRowStarts starts={timing.starts} late={timing.late} />
						</>
					)}
					<div className="flex min-w-0 flex-col gap-1.5 [grid-area:step]">
						<p className="flex items-center gap-2 font-semibold text-white">
							{icon}
							<span className="min-w-0">{title}</span>
						</p>
						<CombatGroupToggle title={title} open={open} changes={changes} />
					</div>
					<CombatGroupSummary view={view} className="[grid-area:hits]" />
					{view.total.final > 0 && (
						<div className="flex flex-col items-end [grid-area:damage]">
							<span className="sr-only">Damage </span>
							<CombatDamageAmount final={view.total.final} parts={view.byType}>
								<CombatDamageSubline raw={view.total.raw} />
							</CombatDamageAmount>
						</div>
					)}
					{timing && (
						<CombatRowTotals
							dealt={timing.dealt}
							targetHealth={timing.targetHealth}
							healthShare={timing.healthShare}
						/>
					)}
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove group ${title}`}
						onClick={onRemove}
						className="[grid-area:remove]"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<CollapsibleContent>
					<ol
						aria-label={`Steps of group ${title}`}
						className="flex flex-col border-line border-t"
					>
						{children}
					</ol>
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}
