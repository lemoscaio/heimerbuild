import { GameIcon } from "@/components/common/game-icon"
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
			aria-label={item.name}
			onClick={() => onItemClick(item.id)}
		>
			<GameIcon
				src={item.icon}
				name={item.name}
				width={40}
				height={40}
				loading="lazy"
				className="size-10"
			/>
		</ItemButton>
	))
}
