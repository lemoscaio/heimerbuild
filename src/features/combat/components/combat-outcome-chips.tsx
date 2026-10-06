import { cva } from "class-variance-authority"
import { cn } from "@/lib/cn"
import type { OutcomeView } from "../lib/combat-view"

/** Gold: what the rules computed. An outcome that didn't happen is quieter. */
const chip = cva(
	"rounded-full border px-2 py-0.5 text-[0.625rem] leading-snug",
	{
		variants: {
			happened: {
				true: "border-outcome-line bg-outcome-fill text-outcome-ink",
				false: "border-line bg-surface text-subtle",
			},
		},
	},
)

/** "Hail of Blades 2/3", "Harrier: consumes the mark: yes", or when it is ready again. */
function chipText({ label, happened, detail }: OutcomeView) {
	if (detail) return happened ? `${label} ${detail}` : `${label}: ${detail}`
	return `${label}: ${happened ? "yes" : "no"}`
}

type CombatOutcomeChipsProps = {
	outcomes: readonly OutcomeView[]
} & React.ComponentProps<"ul">

/** A step's outcomes as the rules computed them, read-only (strict mode). */
export function CombatOutcomeChips({
	outcomes,
	className,
	...props
}: CombatOutcomeChipsProps) {
	if (!outcomes.length) return null
	return (
		<ul
			aria-label="Outcomes"
			className={cn("flex flex-wrap gap-1", className)}
			{...props}
		>
			{outcomes.map((outcome) => (
				<li key={outcome.id} className={chip({ happened: outcome.happened })}>
					{chipText(outcome)}
				</li>
			))}
		</ul>
	)
}
