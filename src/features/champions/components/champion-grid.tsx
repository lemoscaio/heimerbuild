import { cn } from "@/lib/cn"

/** The grid of champion cards, its placeholders and its messages. */
export function ChampionGrid({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"grid grid-cols-4 content-start gap-x-2 gap-y-3 text-white sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 lg:gap-x-3 xl:grid-cols-12",
				className,
			)}
			{...props}
		/>
	)
}
