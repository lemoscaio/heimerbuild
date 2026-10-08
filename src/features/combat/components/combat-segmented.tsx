import { useId } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"

type CombatSegmentedProps = { label: string } & React.ComponentProps<
	typeof ToggleGroup<string>
>

/** A label ("View", "Order by") over its segmented choices, one pressed at a time. */
export function CombatSegmented({
	label,
	children,
	...props
}: CombatSegmentedProps) {
	const labelId = useId()
	return (
		<div className="flex items-center gap-1.5">
			<span id={labelId} className="text-subtle text-xs">
				{label}
			</span>
			<ToggleGroup
				aria-labelledby={labelId}
				className="gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.5"
				{...props}
			>
				{children}
			</ToggleGroup>
		</div>
	)
}

export function CombatSegmentedItem({
	className,
	...props
}: React.ComponentProps<typeof ToggleGroupItem<string>>) {
	return (
		<ToggleGroupItem
			className={cn(
				"h-6 rounded-md px-3 text-xs data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:font-semibold data-pressed:text-surface-sunken",
				className,
			)}
			{...props}
		/>
	)
}
