import { ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { MoveAction } from "../hooks/use-step-reorder"

type CombatMoveButtonsProps = {
	/** What moves, in the buttons' names: "step 2, Attack" gives "Move step 2, Attack up". */
	label: string
	up: MoveAction
	down: MoveAction
} & React.ComponentProps<"div">

/**
 * "Move up" and "Move down" for an entry of the combo, 44 px to tap on phones. A disabled one keeps
 * its focus, so moving an entry to the top or bottom never drops the keyboard user.
 */
export function CombatMoveButtons({
	label,
	up,
	down,
	className,
	...props
}: CombatMoveButtonsProps) {
	return (
		<div className={cn("flex shrink-0", className)} {...props}>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Move ${label} up`}
				disabled={up.disabled}
				focusableWhenDisabled
				onClick={up.onClick}
				className="max-lg:size-11"
			>
				<ChevronUp aria-hidden="true" />
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={`Move ${label} down`}
				disabled={down.disabled}
				focusableWhenDisabled
				onClick={down.onClick}
				className="max-lg:size-11"
			>
				<ChevronDown aria-hidden="true" />
			</Button>
		</div>
	)
}
