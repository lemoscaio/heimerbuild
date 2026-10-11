import { useId } from "react"
import { Segmented } from "@/components/ui/segmented"

type CombatSegmentedProps = { label: string } & React.ComponentProps<
	typeof Segmented<string>
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
			<Segmented aria-labelledby={labelId} {...props}>
				{children}
			</Segmented>
		</div>
	)
}
