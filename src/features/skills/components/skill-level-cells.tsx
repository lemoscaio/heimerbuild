import type { AbilitySlot } from "@schemas/champion"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { LevelPoint } from "../lib/skill-history"

type SkillLevelCellsProps = {
	point: LevelPoint
	onPlace: (slot: AbilitySlot) => void
	orientation?: "horizontal" | "vertical"
} & Pick<React.ComponentProps<"div">, "className" | "children">

/** A level's four cells: one toggle group while its point can be chosen, else plain cells. */
export function SkillLevelCells({
	point,
	onPlace,
	className,
	orientation,
	children,
}: SkillLevelCellsProps) {
	if (point.state !== "spent" && point.state !== "free") {
		return <div className={cn("flex", className)}>{children}</div>
	}
	const chosen = point.state === "spent" ? point.slot : undefined
	return (
		<ToggleGroup
			aria-label={`Level ${point.level} point`}
			orientation={orientation}
			className={className}
			value={chosen ? [chosen] : []}
			onValueChange={([next]) => next && next !== chosen && onPlace(next)}
		>
			{children}
		</ToggleGroup>
	)
}
