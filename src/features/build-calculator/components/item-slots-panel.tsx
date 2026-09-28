import { cn } from "@/lib/cn"

/** The inset panel around the chosen item slots, shared with its loading placeholder. */
export function ItemSlotsPanel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"bg-primary-3 pt-3 pb-1 shadow-[inset_0_0_8px_rgb(0_0_0/0.7)]",
				className,
			)}
			{...props}
		/>
	)
}
