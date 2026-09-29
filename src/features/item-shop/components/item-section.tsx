import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { ItemButton } from "@/components/common/item-button"
import { cn } from "@/lib/cn"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import type { useRovingFocus } from "../hooks/use-roving-focus"
import type { ShopSection } from "../lib/group-shop-items"
import type { ItemPickProps } from "../types/item-pick"

/** `lg`: bigger tiles with the price under the icon, for the expanded shop. */
export type TileSize = "md" | "lg"

type ItemSectionProps = {
	tileSize: TileSize
	section: ShopSection<Item>
	getItemProps: ReturnType<typeof useRovingFocus>["getItemProps"]
} & ItemPickProps

/** One titled shop section: a labelled group of item tiles. */
export function ItemSection({
	section: { title, items },
	tileSize,
	selectedItemId,
	onItemSelect,
	onItemAdd,
	getItemProps,
}: ItemSectionProps) {
	const id = useId()
	const isLarge = tileSize === "lg"

	return (
		<fieldset className="min-w-0" aria-labelledby={`${id}-title`}>
			<h3 className="flex items-baseline gap-2 pb-2 font-bold font-display text-sm">
				<span id={`${id}-title`}>{title}</span>
				<span className="font-normal font-sans text-subtle text-xs">
					{items.length}
				</span>
			</h3>
			<div
				className={cn("grid grid-cols-[repeat(auto-fill,2.5rem)] gap-1.5", {
					"grid-cols-[repeat(auto-fill,3.5rem)] gap-x-2 gap-y-3": isLarge,
				})}
			>
				{items.map((item, index) => (
					<ItemButton
						key={item.id}
						item={item}
						aria-label={item.name}
						aria-describedby={`${id}-${index}`}
						aria-pressed={item.id === selectedItemId}
						className={cn(
							"rounded-sm aria-pressed:ring-2 aria-pressed:ring-gold",
							{
								"flex flex-col items-center gap-0.5 rounded-md": isLarge,
							},
						)}
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
							width={isLarge ? 56 : 40}
							height={isLarge ? 56 : 40}
							loading="lazy"
							className={cn("size-10", { "size-14 rounded-md": isLarge })}
						/>
						{isLarge && (
							<span className="text-[0.625rem] text-gold tabular-nums">
								{item.gold.total}
							</span>
						)}
						<span id={`${id}-${index}`} hidden>
							{index + 1} of {items.length}
						</span>
					</ItemButton>
				))}
			</div>
		</fieldset>
	)
}
