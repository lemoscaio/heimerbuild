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
import { CombatRunningTotal } from "./combat-running-total"
import { CombatStartTime } from "./combat-start-time"

type CombatStepGroupProps = {
	/** "1–8. Attack ×8" */
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
	/** Its steps' cards and their procs, shown once open. */
	children: React.ReactNode
} & React.ComponentProps<"li">

/**
 * A run of identical steps as one card (issue 331, option A): when its hits land and when it starts,
 * its damage by type and total, what its steps did as counts ("Hail of Blades 3/8") and the
 * running total after it. It moves and goes as a whole; "Show steps" lists its steps.
 */
export function CombatStepGroup({
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
}: CombatStepGroupProps) {
	return (
		<li
			className={cn(
				"rounded-lg border border-lilac/70 bg-surface-sunken px-1 py-1.5 shadow-[inset_3px_0_0_var(--color-lilac)]",
				{ "bg-surface-raised": !!timing?.late },
				className,
			)}
			{...props}
		>
			<Collapsible
				open={open}
				onOpenChange={onOpenChange}
				className="flex flex-col gap-1.5"
			>
				<div className="grid grid-cols-[auto_auto_1fr_auto_auto] items-start gap-x-2">
					{moves}
					<span className="pt-0.5">{icon}</span>
					<div className="flex min-w-0 flex-col gap-1">
						<p className="flex flex-wrap items-baseline gap-x-2 text-white text-xs">
							{timing && <CombatLandTime lands={timing.lands} />}
							<span className="font-semibold">{title}</span>
							{timing && (
								<CombatStartTime starts={timing.starts} late={timing.late} />
							)}
						</p>
						<CombatGroupSummary view={view} />
						{timing && (
							<CombatRunningTotal
								dealt={timing.dealt}
								targetHealth={timing.targetHealth}
								healthShare={timing.healthShare}
							/>
						)}
						<CombatGroupToggle title={title} open={open} changes={changes} />
					</div>
					<div className="flex flex-col items-end">
						{view.total.final > 0 && (
							<CombatDamageAmount final={view.total.final} parts={view.byType}>
								<CombatDamageSubline raw={view.total.raw} />
							</CombatDamageAmount>
						)}
					</div>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Remove group ${title}`}
						onClick={onRemove}
						className="max-lg:size-11"
					>
						<X aria-hidden="true" />
					</Button>
				</div>
				<CollapsibleContent>
					<ol
						aria-label={`Steps of group ${title}`}
						className="ml-1 flex flex-col gap-1.5 border-lilac/40 border-l pl-1.5 sm:ml-3 sm:pl-2"
					>
						{children}
					</ol>
				</CollapsibleContent>
			</Collapsible>
		</li>
	)
}
