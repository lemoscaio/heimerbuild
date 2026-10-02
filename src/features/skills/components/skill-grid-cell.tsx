import type { ChampionSpell } from "@schemas/champion"
import { cva, type VariantProps } from "class-variance-authority"
import { RotateCcw } from "lucide-react"
import { ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { SkillPoint } from "../lib/skill-history"

const gridCellVariants = cva(
	"flex size-full items-center justify-center rounded-md border font-bold font-display text-xs tabular-nums",
	{
		variants: {
			state: {
				picked: "border-gold bg-gold text-surface-sunken data-pressed:bg-gold",
				auto: "border-gold border-dashed text-gold data-pressed:bg-transparent",
				open: "border-line bg-surface-sunken text-transparent hover:border-lilac hover:text-subtle",
				blocked: "border-line/60 bg-hatched text-transparent",
				kept: "border-line-strong border-dashed text-subtle",
				future: "border-line/40 bg-surface-sunken/40",
			},
			size: {
				/** The desktop grid: free cells show "+" on hover only. */
				compact: "h-9 text-xs",
				/** The phone list: every cell shows its ability letter. */
				large: "h-11 text-sm",
			},
		},
		compoundVariants: [
			{ size: "large", state: "open", class: "text-subtle hover:text-white" },
			{ size: "large", state: "blocked", class: "text-subtle/40" },
		],
		defaultVariants: { size: "compact" },
	},
)

type SkillGridCellProps = {
	spell: ChampionSpell
	level: number
	/** That level's point, while the level is reached. */
	point: SkillPoint | undefined
	/** Whether the point of that level may move to this ability. */
	canPlace: boolean
	/** A pick kept above the current level for this ability. */
	isKept: boolean
} & Pick<VariantProps<typeof gridCellVariants>, "size"> &
	Omit<React.ComponentProps<typeof ToggleGroupItem>, "value" | "size">

/**
 * One ability at one level: its point (showing the rank it reaches, unless `children` says
 * otherwise), a free cell, or a blocked one.
 */
export function SkillGridCell({
	spell,
	level,
	point,
	canPlace,
	isKept,
	size,
	className,
	children,
	...props
}: SkillGridCellProps) {
	if (!point) {
		return (
			<span
				className={cn(
					gridCellVariants({ state: isKept ? "kept" : "future", size }),
					className,
				)}
			>
				{isKept && (
					<>
						<RotateCcw aria-hidden="true" className="size-3" />
						<span className="sr-only">
							Level {level}: {spell.slot}, kept for when the level goes back up
						</span>
					</>
				)}
			</span>
		)
	}
	const isPoint = point.slot === spell.slot
	const state = isPoint
		? point.isAuto
			? "auto"
			: "picked"
		: canPlace
			? "open"
			: "blocked"

	return (
		<ToggleGroupItem
			value={spell.slot}
			aria-label={`${spell.slot} ${spell.name}`}
			disabled={!isPoint && !canPlace}
			className={cn(
				"h-auto min-w-0 rounded-md p-0 disabled:opacity-100 data-pressed:inset-ring-0",
				gridCellVariants({ state, size }),
				className,
			)}
			{...props}
		>
			{children ?? (isPoint ? point.rank : "+")}
		</ToggleGroupItem>
	)
}
