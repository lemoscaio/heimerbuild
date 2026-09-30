import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { ItemButton } from "@/components/common/item-button"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import type { useRovingFocus } from "../hooks/use-roving-focus"
import type { ShopSection } from "../lib/group-shop-items"
import type { ItemPickProps } from "../types/item-pick"

type ItemSectionProps = {
	section: ShopSection<Item>
	getItemProps: ReturnType<typeof useRovingFocus>["getItemProps"]
} & ItemPickProps

/** One titled shop section: a labelled group of item tiles. */
export function ItemSection({
	section: { title, items },
	selectedItemId,
	onItemSelect,
	onItemAdd,
	getItemProps,
}: ItemSectionProps) {
	const id = useId()

	return (
		<fieldset className="min-w-0" aria-labelledby={`${id}-title`}>
			<h3 className="flex items-baseline gap-2 pb-2 font-bold font-display text-sm">
				<span id={`${id}-title`}>{title}</span>
				<span className="font-normal font-sans text-subtle text-xs">
					{items.length}
				</span>
			</h3>
			<div className="grid grid-cols-[repeat(auto-fill,2.5rem)] gap-1.5">
				{items.map((item, index) => (
					<ItemButton
						key={item.id}
						item={item}
						aria-label={item.name}
						aria-describedby={`${id}-${index}`}
						aria-pressed={item.id === selectedItemId}
						className="rounded-sm aria-pressed:ring-2 aria-pressed:ring-gold"
						onClick={(event) => {
							// Enter or Space on the selected item adds it (a keyboard click has no detail).
							if (event.detail === 0 && item.id === selectedItemId) {
								onItemAdd(item.id)
							} else {
								onItemSelect(item.id)
							}
						}}
						onDoubleClick={() => onItemAdd(item.id)}
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
						<span id={`${id}-${index}`} hidden>
							{index + 1} of {items.length}
						</span>
					</ItemButton>
				))}
			</div>
		</fieldset>
	)
}
