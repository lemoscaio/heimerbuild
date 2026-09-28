import { cn } from "@/lib/cn"

/** The level label and slider row, shared with its loading placeholder. */
export function LevelRowLayout({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex items-center gap-6 bg-linear-to-b from-primary-3 to-primary-2 px-4 py-3 text-white",
				className,
			)}
			{...props}
		/>
	)
}
