import { cn } from "@/lib/cn"

/** A card in a workbench column; below `lg` the cards join into one stacked page. */
export function WorkbenchPanel({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"bg-surface px-4 py-3 lg:rounded-xl lg:border lg:border-line lg:p-4",
				className,
			)}
			{...props}
		/>
	)
}
