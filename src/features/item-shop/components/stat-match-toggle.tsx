import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { StatMatch } from "../lib/filter-items-by-stats"

const matchOptions: readonly {
	match: StatMatch
	label: string
	title: string
}[] = [
	{ match: "all", label: "AND", title: "Items with every selected stat" },
	{ match: "any", label: "OR", title: "Items with any selected stat" },
]

type StatMatchToggleProps = {
	match: StatMatch
	onMatchChange: (match: StatMatch) => void
}

export function StatMatchToggle({
	match,
	onMatchChange,
}: StatMatchToggleProps) {
	return (
		<ToggleGroup
			aria-label="Match selected stats"
			className="shrink-0 gap-0 rounded-sm border border-primary-1 p-0.5"
			value={[match]}
			// Pressing the selected mode again would leave none: one mode is always selected.
			onValueChange={([next]) => next && onMatchChange(next)}
		>
			{matchOptions.map(({ match: option, label, title }) => (
				<ToggleGroupItem
					key={option}
					value={option}
					title={title}
					className="h-6 min-w-0 px-2 font-display font-semibold text-white text-xs max-lg:h-11 max-lg:min-w-11 max-lg:px-3"
				>
					{label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
