import { cn } from "@/lib/cn"

/** The site is a beta: its numbers are still being checked in game. */
export function BetaBadge({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			className={cn(
				"select-none rounded-full border border-lilac px-1.5 py-0.5 font-sans font-semibold text-lilac text-xs uppercase leading-none tracking-wide",
				className,
			)}
			{...props}
		>
			Beta
		</span>
	)
}
