import { useLayoutEffect, useRef } from "react"
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
	const slotsRef = useRef<HTMLFieldSetElement>(null)
	const removedSlot = useRef<number | undefined>(undefined)

	// The removed button unmounts: keep keyboard focus on the slot that took its place.
	useLayoutEffect(() => {
		const slot = removedSlot.current
		const container = slotsRef.current
		if (slot === undefined || !container) return
		removedSlot.current = undefined
		const next =
			container.querySelectorAll("button")[Math.min(slot, items.length - 1)]
		;(next ?? container).focus()
	}, [items])

	function handleRemove(slot: number, event: React.MouseEvent<HTMLElement>) {
		if (event.currentTarget === document.activeElement) {
			removedSlot.current = slot
		}
		onRemoveItem(slot)
	}

	return (
		<div className="champion-info__chosen-items chosen-items">
			<fieldset ref={slotsRef} className="chosen-items__slots" tabIndex={-1}>
				<legend className="sr-only">Chosen items</legend>
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
							onClick={(event) => handleRemove(slot, event)}
						>
							<img
								src={item.icon}
								alt=""
								className="chosen-items__item-image"
							/>
						</ItemButton>
					)
				})}
			</fieldset>
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
