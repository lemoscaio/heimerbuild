import { cn } from "@/lib/cn"

/** The scrolling area of the shop that holds the items, their placeholders or a message. */
export function ItemList({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn(
				"scrollbar-purple flex h-[40vh] flex-wrap content-start justify-center gap-1.5 overflow-y-auto rounded-md bg-primary-4 p-1.5 lg:h-auto lg:min-h-0 lg:flex-1",
				className,
			)}
			{...props}
		/>
	)
}
