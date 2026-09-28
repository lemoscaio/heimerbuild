import { cn } from "@/lib/cn"

/** Portrait, name block and actions in one row, shared with the loading placeholder. */
export function ChampionHeaderLayout({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative flex items-center gap-5 bg-primary-3 px-4 pt-4 text-white lg:rounded-t-xl",
				className,
			)}
			{...props}
		/>
	)
}
