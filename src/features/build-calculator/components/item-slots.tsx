import { TriangleAlert } from "lucide-react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { ItemButton } from "@/components/common/item-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { track } from "@/lib/analytics/analytics"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { MAX_ITEMS } from "../lib/build-items"
import {
	type BuildViolation,
	findBuildViolations,
} from "../lib/build-violations"
import { ItemSlotsPanel } from "./item-slots-panel"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

type ItemSlotsProps = {
	items: readonly Item[]
	onRemoveItem: (slot: number) => void
	/** Why the last item could not be added, announced to screen readers. */
	notice: string | undefined
}

export function ItemSlots({ items, onRemoveItem, notice }: ItemSlotsProps) {
	const violations = findBuildViolations(items)
	const brokenRules = violations.map(({ group }) => group).join(",")
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

	useEffect(() => {
		if (brokenRules) {
			track("impossible_build_warning_shown", { rules: brokenRules.split(",") })
		}
	}, [brokenRules])

	function handleRemove(slot: number, event: React.MouseEvent<HTMLElement>) {
		if (event.currentTarget === document.activeElement) {
			removedSlot.current = slot
		}
		onRemoveItem(slot)
	}

	return (
		<ItemSlotsPanel>
			<fieldset
				ref={slotsRef}
				className="flex justify-center gap-1.5"
				tabIndex={-1}
			>
				<legend className="sr-only">Chosen items</legend>
				{slots.map((slot) => {
					const item = items[slot]
					if (!item) {
						return (
							<div
								key={`empty-${slot}`}
								className="size-10 rounded-sm bg-primary-1"
							/>
						)
					}
					return (
						<ItemButton
							key={`${slot}-${item.id}`}
							item={item}
							className="size-10 rounded-sm bg-primary-1"
							aria-label={`Remove ${item.name}`}
							onClick={(event) => handleRemove(slot, event)}
						>
							<GameIcon
								src={item.icon}
								name={item.name}
								className="size-full rounded-sm"
							/>
						</ItemButton>
					)
				})}
			</fieldset>
			<div
				className="flex min-h-5 flex-col items-center gap-2 px-2.5 pt-1 pb-2 text-center text-lilac text-xs"
				role="status"
				aria-live="polite"
			>
				{notice && <p>{notice}</p>}
				{!!violations.length && <BuildWarning violations={violations} />}
			</div>
		</ItemSlotsPanel>
	)
}

function BuildWarning({ violations }: { violations: BuildViolation[] }) {
	return (
		// The surrounding status region announces the warning: no nested alert.
		<Alert variant="warning" role="none" className="w-fit max-w-sm text-xs">
			<TriangleAlert aria-hidden="true" />
			<AlertTitle>Not possible in-game</AlertTitle>
			<AlertDescription className="text-xs">
				<ul>
					{violations.map(({ group, message }) => (
						<li key={group}>{message}</li>
					))}
				</ul>
			</AlertDescription>
		</Alert>
	)
}
