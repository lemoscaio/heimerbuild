import type { AbilitySlot, ChampionSpell } from "@schemas/champion"
import { cva, type VariantProps } from "class-variance-authority"
import { RotateCcw } from "lucide-react"
import { ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { LevelPoint } from "../lib/skill-history"

const gridCellVariants = cva(
	"flex size-full items-center justify-center rounded-md border font-bold font-display text-xs tabular-nums",
	{
		variants: {
			state: {
				spent: "border-gold bg-gold text-surface-sunken data-pressed:bg-gold",
				suggested:
					"border-gold border-dashed text-gold hover:bg-gold/15 data-pressed:bg-transparent",
				open: "border-line-strong bg-surface-sunken text-transparent hover:border-lilac hover:text-subtle",
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

type GridCellState = NonNullable<VariantProps<typeof gridCellVariants>["state"]>

/** What one ability's cell shows at one level. */
function gridCellState(
	point: LevelPoint,
	slot: AbilitySlot,
	canPlace: boolean,
): GridCellState {
	switch (point.state) {
		case "spent":
			return point.slot === slot ? "spent" : canPlace ? "open" : "blocked"
		case "free":
			return point.suggestion === slot
				? "suggested"
				: canPlace
					? "open"
					: "blocked"
		case "kept":
			return point.slot === slot ? "kept" : "future"
		default:
			return point.state
	}
}

type SkillGridCellProps = {
	spell: ChampionSpell
	point: LevelPoint
	/** Whether that level's point may go to this ability. */
	canPlace: boolean
} & Pick<VariantProps<typeof gridCellVariants>, "size"> &
	Omit<React.ComponentProps<typeof ToggleGroupItem>, "value" | "size">

/**
 * One ability at one level: a spent point (showing the rank it reaches, unless `children` says
 * otherwise), the suggestion, a free cell, or a blocked one.
 */
export function SkillGridCell({
	spell,
	point,
	canPlace,
	size,
	className,
	children,
	...props
}: SkillGridCellProps) {
	const state = gridCellState(point, spell.slot, canPlace)

	if (point.state !== "spent" && point.state !== "free") {
		return (
			<span className={cn(gridCellVariants({ state, size }), className)}>
				{state === "kept" && (
					<>
						<RotateCcw aria-hidden="true" className="size-3" />
						<span className="sr-only">
							Level {point.level}: {spell.slot}, kept for when the level goes
							back up
						</span>
					</>
				)}
			</span>
		)
	}

	return (
		<ToggleGroupItem
			value={spell.slot}
			aria-label={`${spell.slot} ${spell.name}${state === "suggested" ? ", suggested" : ""}`}
			disabled={state === "blocked"}
			className={cn(
				"h-auto min-w-0 rounded-md p-0 disabled:opacity-100 data-pressed:inset-ring-0",
				gridCellVariants({ state, size }),
				className,
			)}
			{...props}
		>
			{children ??
				(point.state === "spent" && state === "spent" ? point.rank : "+")}
		</ToggleGroupItem>
	)
}
