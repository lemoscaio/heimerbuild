import { Info } from "lucide-react"
import { BugReportLink } from "@/components/common/bug-report-link"
import { cn } from "@/lib/cn"

/** What the combo leaves out, said quietly under it. */
export function CombatNotes({
	className,
	...props
}: React.ComponentProps<"ul">) {
	return (
		<ul
			aria-label="About the combo"
			className={cn("flex flex-col gap-1 text-subtle text-xs", className)}
			{...props}
		>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				<span>
					Beta: the combo's damage and timings are still being checked in game,
					champion by champion. <BugReportLink />
				</span>
			</li>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				Travel time of projectiles and dashes isn't counted.
			</li>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				Slows and Exhaust's damage reduction are listed on the target but not
				counted: the target doesn't move or deal damage yet.
			</li>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				The combo starts from its Combo start (every cooldown ready unless
				removed, the stacks and buffs added there) and the situation markers
				placed in it, and ignores the stats panel's switches.
			</li>
			<li className="flex items-start gap-1.5">
				<Info aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
				Stacks gained over the match (Siphoning Strike's, Phenomenal Evil's) are
				set in the Effects list and don't grow during the combo.
			</li>
		</ul>
	)
}
