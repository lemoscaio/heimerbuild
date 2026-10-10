import { cn } from "@/lib/cn"
import { formatDamage } from "../lib/combat-format"

type CombatRunningTotalProps = {
	dealt: number
	targetHealth: number
	/** The target's health as a share of its maximum, for the bar. */
	healthShare: number
} & React.ComponentProps<"p">

/** The damage down the rows so far and the target's health after it, as in the expanded rows: "so far 257 [bar] 1,543". */
export function CombatRunningTotal({
	dealt,
	targetHealth,
	healthShare,
	className,
	...props
}: CombatRunningTotalProps) {
	return (
		<p
			className={cn(
				"flex items-center gap-2 text-[0.6875rem] tabular-nums",
				className,
			)}
			{...props}
		>
			<span className="whitespace-nowrap text-prose">
				<span className="text-subtle">so far</span> {formatDamage(dealt)}
			</span>
			<span
				aria-hidden="true"
				className="block h-1 min-w-8 flex-1 overflow-hidden rounded-full bg-surface-raised"
			>
				<span
					className="block h-full bg-health"
					style={{ width: `${Math.round(healthShare * 100)}%` }}
				/>
			</span>
			<span className="whitespace-nowrap text-health">
				<span className="sr-only">Target health </span>
				{formatDamage(targetHealth)}
			</span>
		</p>
	)
}
