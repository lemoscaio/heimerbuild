import { ItemButton } from "@/components/common/item-button"
import type { Item } from "../../../../scripts/sync-data/schemas/item"

type ItemGridProps = {
	items: readonly Item[]
	onItemClick: (itemId: string) => void
}

export function ItemGrid({ items, onItemClick }: ItemGridProps) {
	return items.map((item) => (
		<ItemButton
			key={item.id}
			item={item}
			className="items__item-card icon-button"
			aria-label={item.name}
			onClick={() => onItemClick(item.id)}
		>
			<img
				src={item.icon}
				alt=""
				width={40}
				height={40}
				loading="lazy"
				className="items__item-image"
			/>
		</ItemButton>
	))
}
