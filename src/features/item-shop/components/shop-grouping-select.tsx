import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/cn"
import type { ShopGrouping } from "@/types/shop-view"

const groupingOptions: readonly { value: ShopGrouping; label: string }[] = [
	{ value: "tiers", label: "Game tiers" },
	{ value: "compact", label: "Compact" },
	{ value: "none", label: "None" },
]

type ShopGroupingSelectProps = {
	grouping: ShopGrouping
	onGroupingChange: (grouping: ShopGrouping) => void
	className?: string
}

export function ShopGroupingSelect({
	grouping,
	onGroupingChange,
	className,
}: ShopGroupingSelectProps) {
	return (
		<Select
			items={groupingOptions}
			value={grouping}
			onValueChange={(value) => value && onGroupingChange(value)}
		>
			<div
				className={cn(
					"flex items-center gap-1.5 text-white text-xs",
					className,
				)}
			>
				<SelectLabel>Group by</SelectLabel>
				<SelectTrigger size="sm" className="w-32 max-lg:data-[size=sm]:h-11">
					<SelectValue />
				</SelectTrigger>
			</div>
			<SelectContent>
				{groupingOptions.map(({ value, label }) => (
					<SelectItem key={value} value={value} className="text-xs">
						{label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}
