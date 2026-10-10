import type { Item } from "@schemas/item"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"

type ItemSummaryProps = {
	item: Item
	/** Id for the name heading, so the surrounding section can be labelled by it. */
	headingId: string
	size?: "md" | "lg"
	/** What the item is beyond its price ("Upgrade of Manamune · 360 Manaflow"). */
	note?: string
	/** Actions at the end of the row, such as a close button. */
	children?: React.ReactNode
}

/** Icon, name and price of an item. */
export function ItemSummary({
	item,
	headingId,
	size = "md",
	note,
	children,
}: ItemSummaryProps) {
	const isLarge = size === "lg"

	return (
		<div className="flex items-center gap-3">
			<GameIcon
				src={item.icon}
				name={item.name}
				className={cn("size-11 rounded-lg border-2 border-gold/70", {
					"size-16": isLarge,
				})}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h2
					id={headingId}
					className={cn("font-bold font-display text-base", {
						"text-xl": isLarge,
					})}
				>
					{item.name}
				</h2>
				<span
					className={cn("text-gold text-xs tabular-nums", {
						"text-sm": isLarge,
					})}
				>
					{item.gold.total.toLocaleString("en-US")} gold
				</span>
				{note && <span className="text-lilac text-xs">{note}</span>}
			</div>
			{children}
		</div>
	)
}
