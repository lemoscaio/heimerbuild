import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { useRovingFocus } from "../hooks/use-roving-focus"
import { groupShopItems } from "../lib/group-shop-items"
import type { ItemPickProps } from "../types/item-pick"
import { ItemSection, type TileSize } from "./item-section"

type ItemGridProps = {
	items: readonly Item[]
	tileSize?: TileSize
} & ItemPickProps

/** The items split into shop sections; arrow keys move across them in visual order. */
export function ItemGrid({
	items,
	tileSize = "md",
	...pickProps
}: ItemGridProps) {
	const sections = groupShopItems(items)
	const { containerRef, handleKeyDown, getItemProps } = useRovingFocus(
		sections.flatMap((section) => section.items.map((item) => item.id)),
	)

	if (!items.length) return null

	return (
		<fieldset
			ref={containerRef}
			className="flex w-full min-w-0 flex-col gap-4"
			onKeyDown={handleKeyDown}
		>
			<legend className="sr-only">Items</legend>
			{sections.map((section) => (
				<ItemSection
					key={section.key}
					section={section}
					tileSize={tileSize}
					{...pickProps}
					getItemProps={getItemProps}
				/>
			))}
		</fieldset>
	)
}
