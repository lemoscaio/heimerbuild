import { cn } from "@/lib/cn"
import { type ResistChangeView, resistChangeText } from "../lib/combat-view"

type CombatTargetResistsProps = {
	resists: readonly ResistChangeView[]
} & React.ComponentProps<"ul">

/** The target's resistances its reductions changed, as chips: "Target armor 100 → 70". */
export function CombatTargetResists({
	resists,
	className,
	...props
}: CombatTargetResistsProps) {
	if (!resists.length) return null
	return (
		<ul
			aria-label="Target resistances"
			className={cn("flex flex-wrap gap-1", className)}
			{...props}
		>
			{resists.map((change) => (
				<li
					key={change.resist}
					className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.625rem] text-prose tabular-nums"
				>
					{resistChangeText(change)}
				</li>
			))}
		</ul>
	)
}
