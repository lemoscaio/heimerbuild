import { RotateCcw, WandSparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * `compact`: short link buttons that fit the champion card's skills row; `regular`: outlined
 * buttons with the full names for the Skills tab.
 */
const ACTION_LAYOUTS = {
	compact: {
		button: {
			variant: "link",
			size: "xs",
			className: "h-auto px-0 text-lilac",
		},
		fillLabel: "Recommended",
	},
	regular: {
		button: { variant: "outline", size: "sm", className: undefined },
		fillLabel: "Use recommended order",
	},
} as const

type SkillPointActionsProps = {
	size: keyof typeof ACTION_LAYOUTS
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
	const { button, fillLabel } = ACTION_LAYOUTS[size]

	return (
		<div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
			<ActionButton
				{...button}
				name="Use recommended order"
				hint="Spend the points left as the recommended order says"
				disabled={!canFill}
				onClick={onFill}
			>
				<WandSparkles aria-hidden="true" />
				{fillLabel}
			</ActionButton>
			<ActionButton
				{...button}
				name="Reset skill points"
				hint="Clear every skill point"
				disabled={!canReset}
				onClick={onReset}
			>
				<RotateCcw aria-hidden="true" />
				Reset
			</ActionButton>
		</div>
	)
}

type ActionButtonProps = {
	/** The full accessible name; the visible label may be shorter. */
	name: string
	/** What the action does, in the tooltip. */
	hint: string
} & Omit<React.ComponentProps<typeof Button>, "aria-label">

function ActionButton({ name, hint, ...props }: ActionButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={<Button type="button" aria-label={name} {...props} />}
			/>
			<TooltipContent>{hint}</TooltipContent>
		</Tooltip>
	)
}
