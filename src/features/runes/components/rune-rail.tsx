import { cn } from "@/lib/cn"

/** Rows hung on a vertical line in the `--tree` accent, like the game client. Use `RuneRailRow` inside. */
export function RuneRail({
	className,
	children,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div className={cn("relative ml-7.5", className)} {...props}>
			<span
				aria-hidden="true"
				className="absolute top-1.5 bottom-1.5 -left-5.25 w-0.5 bg-(--tree)/55"
			/>
			<div className="flex flex-col gap-4.5">{children}</div>
		</div>
	)
}
