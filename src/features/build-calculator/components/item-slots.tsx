import { ItemButton } from "@/components/common/item-button"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { MAX_ITEMS } from "../lib/build-items"
import {
	type BuildViolation,
	findBuildViolations,
} from "../lib/build-violations"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

type ItemSlotsProps = {
	items: readonly Item[]
	onRemoveItem: (slot: number) => void
	/** Why the last item could not be added, announced to screen readers. */
	notice: string | undefined
}

export function ItemSlots({ items, onRemoveItem, notice }: ItemSlotsProps) {
	const violations = findBuildViolations(items)
	return (
		<div className="champion-info__chosen-items chosen-items">
			<div className="chosen-items__slots">
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
							key={`${slot}-${item.id}`}
							item={item}
							className="items__item-card chosen-items__item icon-button"
							aria-label={`Remove ${item.name}`}
							onClick={() => onRemoveItem(slot)}
						>
							<img
								src={item.icon}
								alt=""
								className="chosen-items__item-image"
							/>
						</ItemButton>
					)
				})}
			</div>
			<div className="chosen-items__notice" role="status" aria-live="polite">
				{notice && <p>{notice}</p>}
				{!!violations.length && <BuildWarning violations={violations} />}
			</div>
		</div>
	)
}

function BuildWarning({ violations }: { violations: BuildViolation[] }) {
	return (
		<div className="chosen-items__warning">
			<p>Not possible in-game:</p>
			<ul className="chosen-items__violations">
				{violations.map(({ group, message }) => (
					<li key={group}>{message}</li>
				))}
			</ul>
		</div>
	)
}
