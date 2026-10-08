import { cn } from "@/lib/cn"
import { type RunningEffectView, runningEffectText } from "../lib/combat-view"

type CombatRunningEffectsProps = {
	effects: readonly RunningEffectView[]
} & React.ComponentProps<"ul">

/** The effects running after a step, as chips with when they end ("Heightened Senses · until 3.96 s"). */
export function CombatRunningEffects({
	effects,
	className,
	...props
}: CombatRunningEffectsProps) {
	if (!effects.length) return null
	return (
		<ul
			aria-label="Effects running"
			className={cn("flex flex-wrap gap-1", className)}
			{...props}
		>
			{effects.map((effect) => (
				<li
					key={`${effect.name}@${effect.until}@${effect.waiting?.from}`}
					className="rounded-full border border-line-strong bg-surface px-2 py-0.5 text-[0.625rem] text-prose"
				>
					{runningEffectText(effect)}
				</li>
			))}
		</ul>
	)
}
