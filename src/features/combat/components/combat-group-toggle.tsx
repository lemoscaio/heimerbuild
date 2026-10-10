import { ChevronDown } from "lucide-react"
import { CollapsibleTrigger } from "@/components/ui/collapsible"

type CombatGroupToggleProps = {
	/** "1–8. Attack ×8" */
	title: string
	open: boolean
	/** Free mode's answers inside that differ from the computed ones; none outside free mode. */
	changes?: number
}

/** "Show steps" / "Hide steps" of a group, with free mode's changes inside said beside it. */
export function CombatGroupToggle({
	title,
	open,
	changes,
}: CombatGroupToggleProps) {
	return (
		<div className="flex flex-wrap items-center gap-2">
			<CollapsibleTrigger
				aria-label={`${open ? "Hide" : "Show"} steps of group ${title}`}
				className="group inline-flex w-fit items-center gap-1 rounded-md border border-line px-2 py-0.5 text-[0.6875rem] text-lilac hover:border-lilac max-lg:py-1.5"
			>
				<ChevronDown
					aria-hidden="true"
					className="size-3 transition-transform group-data-panel-open:rotate-180"
				/>
				{open ? "Hide steps" : "Show steps"}
			</CollapsibleTrigger>
			{!!changes && (
				<span className="text-[0.6875rem] text-gold">
					● {changes} {changes === 1 ? "change" : "changes"} inside
				</span>
			)}
		</div>
	)
}
