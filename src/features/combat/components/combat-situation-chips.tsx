import { Plus } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { CombatSituation } from "../lib/combat-situations"

type CombatSituationChipsProps = {
	situations: readonly CombatSituation[]
	onAdd: (id: string) => void
	/** The combo has its most entries: nothing more can be added. */
	disabled: boolean
} & React.ComponentProps<"section">

/** "Situation": one chip per situation the build supports; each adds a marker at the end of the combo. */
export function CombatSituationChips({
	situations,
	onAdd,
	disabled,
	className,
	...props
}: CombatSituationChipsProps) {
	const titleId = useId()
	if (!situations.length) return null

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-1", className)}
			{...props}
		>
			<div className="flex flex-wrap items-center gap-1.5">
				<h3 id={titleId} className="font-bold font-display text-sm">
					Situation
				</h3>
				<ul className="flex flex-wrap gap-1.5">
					{situations.map((situation) => (
						<li key={situation.id}>
							<Button
								variant="outline"
								size="sm"
								disabled={disabled}
								onClick={() => onAdd(situation.id)}
								aria-label={`Add marker: ${situation.label}`}
								className="rounded-full border-lilac/60 border-dashed max-lg:h-11"
							>
								<Plus aria-hidden="true" />
								{situation.label}
							</Button>
						</li>
					))}
				</ul>
			</div>
			<p className="text-subtle text-xs">
				A marker goes at the end of the combo: from there on, its situation
				holds.
			</p>
		</section>
	)
}
