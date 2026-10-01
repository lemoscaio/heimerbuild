import { ListFilterPlus } from "lucide-react"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconButton } from "@/components/ui/icon-button"
import { type MoreFilter, moreFilters } from "../lib/more-filters"

type MoreFiltersMenuProps = {
	onPick: (filter: MoreFilter) => void
	/** Where focus goes when the menu closes (Base UI `finalFocus`). */
	finalFocus?: React.ComponentProps<typeof DropdownMenuContent>["finalFocus"]
	className?: string
}

/** Lists the filters only the search knows (`has:active`, `from:`, `gold<=`...); a pick types it. */
export function MoreFiltersMenu({
	onPick,
	finalFocus,
	className,
}: MoreFiltersMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<IconButton label="More filters" className={className} />}
			>
				<ListFilterPlus aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				finalFocus={finalFocus}
				className="w-80 max-w-(--available-width)"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel>Add a filter</DropdownMenuLabel>
					{moreFilters.ready.map((filter) => (
						<MoreFilterItem
							key={filter.example}
							filter={filter}
							onPick={onPick}
						/>
					))}
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>Type a value</DropdownMenuLabel>
					{moreFilters.withValue.map((filter) => (
						<MoreFilterItem
							key={filter.example}
							filter={filter}
							onPick={onPick}
						/>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function MoreFilterItem({
	filter,
	onPick,
}: {
	filter: MoreFilter
	onPick: (filter: MoreFilter) => void
}) {
	const label = filter.kind === "shortcut" ? `${filter.label}…` : filter.label
	return (
		<DropdownMenuItem label={filter.label} onClick={() => onPick(filter)}>
			<span className="min-w-0 truncate">{label}</span>
			<span className="ml-auto shrink-0 pl-2 font-mono text-subtle text-xs">
				{filter.example}
			</span>
		</DropdownMenuItem>
	)
}
