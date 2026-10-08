import { useId } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { CombatRowOrder } from "../lib/combat-rows"

const ORDERS = [
	{ value: "hit", label: "Hit time" },
	{ value: "step", label: "Step" },
] as const satisfies readonly { value: CombatRowOrder; label: string }[]

/** "View" or "Order by" over its segmented choices. */
function Segmented({
	label,
	children,
	...props
}: { label: string } & React.ComponentProps<typeof ToggleGroup<string>>) {
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

function SegmentedItem({
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

type CombatRowsToolbarProps = {
	/** How many steps the combo has (markers left out). */
	count: number
	order: CombatRowOrder
	onOrderChange: (order: CombatRowOrder) => void
} & React.ComponentProps<"div">

/**
 * The steps column's header: its title and count, the view (the list; the timeline comes with
 * issue 402) and the rows' order.
 */
export function CombatRowsToolbar({
	count,
	order,
	onOrderChange,
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
			<div className="flex flex-wrap items-center gap-4">
				<Segmented label="View" value={["list"]}>
					<SegmentedItem value="list">List</SegmentedItem>
					<SegmentedItem value="timeline" disabled>
						Timeline
					</SegmentedItem>
				</Segmented>
				<Segmented
					label="Order by"
					value={[order]}
					onValueChange={([value]) => {
						const next = ORDERS.find((entry) => entry.value === value)
						if (next) onOrderChange(next.value)
					}}
				>
					{ORDERS.map(({ value, label }) => (
						<SegmentedItem key={value} value={value}>
							{label}
						</SegmentedItem>
					))}
				</Segmented>
			</div>
		</div>
	)
}
