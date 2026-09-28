import { cn } from "@/lib/cn"

/** The scrolling area of the shop that holds the items, their placeholders or a message. */
export function ItemList({
	className,
	...props
}: React.ComponentProps<"section">) {
	return (
		<section
			className={cn(
				"scrollbar-purple flex h-[40vh] flex-wrap content-start justify-center gap-1.5 overflow-y-auto bg-primary-4 px-1.5 pb-2.5",
				className,
			)}
			{...props}
		/>
	)
}
