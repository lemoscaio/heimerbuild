import { cn } from "@/lib/cn"

/** The wrapping grid of champion cards, its placeholders and its messages. */
export function ChampionGrid({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-start justify-center gap-2 px-4 py-2.5 text-white sm:gap-4",
				className,
			)}
			{...props}
		/>
	)
}
