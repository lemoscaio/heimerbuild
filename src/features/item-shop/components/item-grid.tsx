import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { ItemButton } from "@/components/common/item-button"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { useRovingFocus } from "../hooks/use-roving-focus"

type ItemGridProps = {
	items: readonly Item[]
	onItemClick: (itemId: string) => void
}

export function ItemGrid({ items, onItemClick }: ItemGridProps) {
	const positionId = useId()
	const { containerRef, handleKeyDown, getItemProps } = useRovingFocus(
		items.map((item) => item.id),
	)

	if (!items.length) return null

	return (
		<fieldset
			ref={containerRef}
			className="flex w-full min-w-0 flex-wrap content-start justify-center gap-1.5"
			onKeyDown={handleKeyDown}
		>
			<legend className="sr-only">Items</legend>
			{items.map((item, index) => (
				<ItemButton
					key={item.id}
					item={item}
					aria-label={item.name}
					aria-describedby={`${positionId}-${index}`}
					onClick={() => onItemClick(item.id)}
					{...getItemProps(item.id)}
				>
					<GameIcon
						src={item.icon}
						name={item.name}
						width={40}
						height={40}
						loading="lazy"
						className="size-10"
					/>
					<span id={`${positionId}-${index}`} hidden>
						{index + 1} of {items.length}
					</span>
				</ItemButton>
			))}
		</fieldset>
	)
}
