import type { Item } from "../../../../scripts/sync-data/schemas/item"

type ItemGridProps = {
	items: readonly Item[]
	onItemClick: (itemId: string) => void
}

export function ItemGrid({ items, onItemClick }: ItemGridProps) {
	return items.map((item) => (
		<button
			type="button"
			key={item.id}
			className="items__item-card icon-button"
			aria-label={item.name}
			onClick={() => onItemClick(item.id)}
		>
			<img src={item.icon} alt="" className="items__item-image" />
		</button>
	))
}
