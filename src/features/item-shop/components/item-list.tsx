import { cn } from "@/lib/cn"

/** The scrolling area of the shop that holds the items, their placeholders or a message. */
export function ItemList({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn(
				"scrollbar-purple flex flex-wrap content-start justify-center gap-1.5 rounded-md bg-surface-sunken p-1.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto",
				className,
			)}
			{...props}
		/>
	)
}
