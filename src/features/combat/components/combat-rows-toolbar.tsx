import { cn } from "@/lib/cn"

type CombatRowsToolbarProps = {
	/** How many steps the combo has (markers left out). */
	count: number
} & React.ComponentProps<"div">

/** The steps' header: its title and count, then its controls (the view, the rows' order). */
export function CombatRowsToolbar({
	count,
	children,
	className,
	...props
}: CombatRowsToolbarProps) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-line border-b px-4 py-2.5",
				className,
			)}
			{...props}
		>
			<h3 className="font-bold font-display text-sm">
				Steps <span className="font-normal font-sans text-subtle">{count}</span>
			</h3>
			<div className="flex flex-wrap items-center gap-4">{children}</div>
		</div>
	)
}
