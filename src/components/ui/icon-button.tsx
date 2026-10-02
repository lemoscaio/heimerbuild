import { Button } from "@/components/ui/button"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"

type IconButtonProps = {
	/** The accessible name, also shown in a tooltip. */
	label: string
} & Omit<React.ComponentProps<typeof Button>, "aria-label">

/**
 * A square button that shows only an icon (its children).
 * It can be a menu trigger: `<DropdownMenuTrigger render={<IconButton ... />} />`.
 */
export function IconButton({
	label,
	className,
	variant = "outline",
	size = "icon",
	...props
}: IconButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						type="button"
						variant={variant}
						size={size}
						aria-label={label}
						className={cn(
							"border-line bg-surface-raised text-prose hover:bg-line hover:text-white aria-expanded:text-white",
							className,
						)}
						{...props}
					/>
				}
			/>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	)
}
