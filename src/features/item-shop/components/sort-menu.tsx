import type { StatKey } from "@schemas/item"
import { ArrowDownUp } from "lucide-react"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconButton } from "@/components/ui/icon-button"
import { cn } from "@/lib/cn"
import { shopStats } from "../lib/shop-stats"
import type { ItemSort, SortDirection } from "../lib/sort-items-by-stat"

const SHOP_ORDER = "shop-order"

const directionOptions: readonly { value: SortDirection; label: string }[] = [
	{ value: "desc", label: "Highest first" },
	{ value: "asc", label: "Lowest first" },
]

type SortMenuProps = {
	sort: ItemSort | undefined
	onSortChange: (sort: ItemSort | undefined) => void
	className?: string
}

/** An icon button that opens the sort options: a stat (or the shop order) and a direction. */
export function SortMenu({ sort, onSortChange, className }: SortMenuProps) {
	const direction = sort?.direction ?? "desc"
	const statLabel = shopStats.find(({ stat }) => stat === sort?.stat)?.label
	const summary = statLabel
		? `${statLabel}, ${direction === "desc" ? "highest" : "lowest"} first`
		: "Shop order"

	function handleStatChange(value: StatKey | typeof SHOP_ORDER) {
		onSortChange(value === SHOP_ORDER ? undefined : { stat: value, direction })
	}

	function handleDirectionChange(nextDirection: SortDirection) {
		if (sort) onSortChange({ ...sort, direction: nextDirection })
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<IconButton
						label={`Sort: ${summary}`}
						className={cn(className, {
							"border-gold/60 text-gold": !!sort,
						})}
					/>
				}
			>
				<ArrowDownUp aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="max-h-[min(var(--available-height),30rem)]"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Direction</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={direction}
						onValueChange={handleDirectionChange}
					>
						{directionOptions.map(({ value, label }) => (
							<DropdownMenuRadioItem key={value} value={value} disabled={!sort}>
								{label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Sort by</DropdownMenuLabel>
					<DropdownMenuRadioGroup
						value={sort?.stat ?? SHOP_ORDER}
						onValueChange={handleStatChange}
					>
						<DropdownMenuRadioItem value={SHOP_ORDER} closeOnClick>
							Shop order
						</DropdownMenuRadioItem>
						{shopStats.map(({ stat, label, icon }) => (
							<DropdownMenuRadioItem key={stat} value={stat} closeOnClick>
								<img src={icon} alt="" className="size-4" />
								{label}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
