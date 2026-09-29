import { cn } from "@/lib/cn"

/** One grid cell (icon over name), shared with the loading placeholders so both keep the same size. */
export function ChampionCardShell({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex min-w-0 flex-col items-center gap-1.5", className)}
			{...props}
		/>
	)
}
