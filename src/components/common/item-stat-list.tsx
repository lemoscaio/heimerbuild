import type { ItemStats } from "@schemas/item"
import { cva, type VariantProps } from "class-variance-authority"
import { type ItemStatLine, itemStatLines } from "@/lib/item-stats"

const statList = cva("", {
	variants: {
		layout: {
			/** One line per stat, value first (item tooltip). */
			list: "",
			/** Stats side by side, wrapping (shop details card). */
			inline: "flex flex-wrap gap-x-3 gap-y-0.5 text-xs",
			/** Label left, value right (expanded shop details panel). */
			table: "flex flex-col gap-1.5 rounded-lg bg-line/60 p-3",
		},
	},
	defaultVariants: { layout: "list" },
})

type ItemStatListProps = { stats: ItemStats } & VariantProps<typeof statList>

/** An item's stat lines ("+25% Attack Speed"); nothing when the item has no stats. */
export function ItemStatList({ stats, layout }: ItemStatListProps) {
	const lines = itemStatLines(stats)
	if (!lines.length) return null

	return (
		<ul className={statList({ layout })}>
			{lines.map((line) =>
				layout === "table" ? (
					<TableLine key={line.stat} {...line} />
				) : (
					<ValueFirstLine key={line.stat} {...line} />
				),
			)}
		</ul>
	)
}

function ValueFirstLine({ value, label }: ItemStatLine) {
	return (
		<li>
			<span className="font-bold text-success">{value}</span> {label}
		</li>
	)
}

function TableLine({ value, label }: ItemStatLine) {
	return (
		<li className="flex justify-between gap-2">
			<span>{label}</span>
			<span className="font-bold text-success tabular-nums">{value}</span>
		</li>
	)
}
