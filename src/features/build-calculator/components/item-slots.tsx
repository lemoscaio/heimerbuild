import { ItemButton } from "@/components/common/item-button"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { MAX_ITEMS } from "../lib/build-items"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

type ItemSlotsProps = {
	items: readonly Item[]
	onItemClick: (itemId: string) => void
}

export function ItemSlots({ items, onItemClick }: ItemSlotsProps) {
	return (
		<div className="champion-info__chosen-items chosen-items">
			{slots.map((slot) => {
				const item = items[slot]
				if (!item) {
					return (
						<div
							key={`empty-${slot}`}
							className="items__item-card chosen-items__item"
						/>
					)
				}
				return (
					<ItemButton
						key={item.id}
						item={item}
						className="items__item-card chosen-items__item icon-button"
						aria-label={`Remove ${item.name}`}
						onClick={() => onItemClick(item.id)}
					>
						<img src={item.icon} alt="" className="chosen-items__item-image" />
					</ItemButton>
				)
			})}
		</div>
	)
}
