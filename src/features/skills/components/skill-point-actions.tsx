import { RotateCcw, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

/** `compact`: link buttons for the skills row; `regular`: outlined buttons for the Skills tab. */
const ACTION_BUTTONS = {
	compact: { variant: "link", size: "xs", className: "h-auto px-0 text-lilac" },
	regular: { variant: "outline", size: "sm", className: undefined },
} as const

type SkillPointActionsProps = {
	size: keyof typeof ACTION_BUTTONS
	/** Some point is left to spend. */
	canFill: boolean
	/** Some point is spent or kept. */
	canReset: boolean
	onFill: () => void
	onReset: () => void
}

/** "Use recommended order" spends the points left; "Reset" clears them all. */
export function SkillPointActions({
	size,
	canFill,
	canReset,
	onFill,
	onReset,
}: SkillPointActionsProps) {
	const button = ACTION_BUTTONS[size]

	return (
		<div className="flex items-center gap-3">
			<Button type="button" {...button} disabled={!canFill} onClick={onFill}>
				<WandSparkles aria-hidden="true" />
				Use recommended order
			</Button>
			<Button type="button" {...button} disabled={!canReset} onClick={onReset}>
				<RotateCcw aria-hidden="true" />
				Reset
			</Button>
		</div>
	)
}
