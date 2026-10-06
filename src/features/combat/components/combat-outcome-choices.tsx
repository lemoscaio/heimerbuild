import { cva } from "class-variance-authority"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { OutcomeView } from "../lib/combat-view"

const choice = cva(
	"flex items-center gap-1.5 rounded-full border bg-outcome-fill py-0.5 pr-0.5 pl-2 text-[0.625rem] text-outcome-ink",
	{
		variants: {
			changed: {
				true: "border-gold",
				false: "border-outcome-line",
			},
		},
	},
)

const ANSWERS = [
	{ value: "yes", label: "Yes" },
	{ value: "no", label: "No" },
] as const

type CombatOutcomeChoicesProps = {
	outcomes: readonly OutcomeView[]
	/** The user's answer for an outcome, by `outcomeId`. */
	onAnswer: (id: string, happened: boolean) => void
	/** Why the step has none of the attacks' outcomes ("Hail of Blades: attacks only"). */
	note?: string
} & React.ComponentProps<"ul">

/** A step's outcomes in free mode: each one Yes or No, starting from the computed one. */
export function CombatOutcomeChoices({
	outcomes,
	onAnswer,
	note,
	className,
	...props
}: CombatOutcomeChoicesProps) {
	if (!outcomes.length && !note) return null
	return (
		<ul
			aria-label="Outcomes"
			className={cn("flex flex-wrap items-center gap-1", className)}
			{...props}
		>
			{outcomes.map((outcome) => (
				<li key={outcome.id} className={choice({ changed: outcome.changed })}>
					<span>{outcome.label}</span>
					<ToggleGroup
						aria-label={outcome.label}
						value={[outcome.happened ? "yes" : "no"]}
						onValueChange={([answer]) => {
							if (answer) onAnswer(outcome.id, answer === "yes")
						}}
						className="gap-0.5"
					>
						{ANSWERS.map(({ value, label }) => (
							<ToggleGroupItem
								key={value}
								value={value}
								aria-label={`${outcome.label}: ${label}`}
								className="h-5 min-w-0 rounded-full px-1.5 text-[0.625rem] data-pressed:bg-lilac data-pressed:text-white max-lg:h-8"
							>
								{label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					{outcome.changed && <span className="pr-1 text-gold">● changed</span>}
				</li>
			))}
			{note && <li className="text-[0.625rem] text-subtle">{note}</li>}
		</ul>
	)
}
