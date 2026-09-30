import { LayoutList } from "lucide-react"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconButton } from "@/components/ui/icon-button"
import type { ShopGrouping } from "@/types/shop-view"

const groupingOptions: readonly { value: ShopGrouping; label: string }[] = [
	{ value: "tiers", label: "Game tiers" },
	{ value: "compact", label: "Compact" },
	{ value: "none", label: "None" },
]

type GroupingMenuProps = {
	grouping: ShopGrouping
	onGroupingChange: (grouping: ShopGrouping) => void
	className?: string
}

/** An icon button that opens the shop view: how items are grouped into sections. */
export function GroupingMenu({
	grouping,
	onGroupingChange,
	className,
}: GroupingMenuProps) {
	const current = groupingOptions.find(({ value }) => value === grouping)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<IconButton
						label={`View: ${current?.label ?? grouping}`}
						className={className}
					/>
				}
			>
				<LayoutList aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Group by</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={grouping}
						onValueChange={onGroupingChange}
					>
						{groupingOptions.map(({ value, label }) => (
							<DropdownMenuRadioItem key={value} value={value} closeOnClick>
								{label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
