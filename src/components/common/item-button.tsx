import { Tooltip } from "@/components/ui/tooltip"
import { useTooltip } from "@/hooks/use-tooltip"
import { itemStatLines } from "@/lib/item-stats"
import type { Item } from "../../../scripts/sync-data/schemas/item"

type ItemButtonProps = {
	item: Item
} & React.ComponentProps<"button">

/** A button for one item (its icon as children) that shows the item's details in a tooltip. */
export function ItemButton({ item, children, ...props }: ItemButtonProps) {
	const tooltip = useTooltip()

	return (
		<>
			<button type="button" {...props} {...tooltip.triggerProps}>
				{children}
			</button>
			{tooltip.anchor && (
				<Tooltip anchor={tooltip.anchor} {...tooltip.tooltipProps}>
					<ItemDetails item={item} />
				</Tooltip>
			)}
		</>
	)
}

function ItemDetails({ item }: { item: Item }) {
	const statLines = itemStatLines(item.stats)

	return (
		<div className="item-details">
			<p className="item-details__name">{item.name}</p>
			<p className="item-details__gold">
				{item.gold.total.toLocaleString("en-US")} gold
			</p>
			{!!statLines.length && (
				<ul className="item-details__stats">
					{statLines.map(({ stat, value, label }) => (
						<li key={stat}>
							<span className="item-details__stat-value">{value}</span> {label}
						</li>
					))}
				</ul>
			)}
			{item.plaintext && (
				<p className="item-details__plaintext">{item.plaintext}</p>
			)}
			{item.description && (
				<p className="item-details__description">{item.description}</p>
			)}
		</div>
	)
}
