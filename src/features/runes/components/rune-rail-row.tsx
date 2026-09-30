import { cn } from "@/lib/cn"

type RuneRailRowProps = {
	/** Fills the row's node on the rail. */
	isPicked: boolean
} & React.ComponentProps<"div">

/** One row of a `RuneRail`: its node on the line, and a divider below all but the last row. */
export function RuneRailRow({
	isPicked,
	className,
	children,
	...props
}: RuneRailRowProps) {
	return (
		<div
			className={cn(
				"relative flex flex-col justify-center gap-2 after:absolute after:inset-x-0 after:-bottom-2.25 after:h-px after:bg-primary-2 last:after:hidden",
				className,
			)}
			{...props}
		>
			<span
				aria-hidden="true"
				className={cn(
					"absolute top-1/2 -left-6.5 size-3 -translate-y-1/2 rounded-full border-(--tree) border-2 bg-primary-3",
					{ "bg-(--tree)": isPicked },
				)}
			/>
			{children}
		</div>
	)
}
