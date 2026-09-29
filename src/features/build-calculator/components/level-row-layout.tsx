import { cn } from "@/lib/cn"

/** The level label, number and slider, shared with its loading placeholder. */
export function LevelRowLayout({
	className,
	...props
}: React.ComponentProps<"div">) {
	return <div className={cn("flex flex-col gap-1", className)} {...props} />
}
