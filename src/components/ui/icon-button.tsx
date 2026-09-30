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
							"border-primary-2 bg-primary-0 text-prose hover:bg-primary-2 hover:text-white aria-expanded:bg-primary-2 aria-expanded:text-white dark:border-primary-2 dark:bg-primary-0 dark:hover:bg-primary-2",
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
