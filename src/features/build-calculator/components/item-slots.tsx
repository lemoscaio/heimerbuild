import type { Item } from "@schemas/item"
import { cva } from "class-variance-authority"
import { TriangleAlert } from "lucide-react"
import { useEffect, useLayoutEffect, useRef } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { ItemButton } from "@/components/common/item-button"
import { PoliteStatus } from "@/components/common/polite-status"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { track } from "@/lib/analytics/analytics"
import { MAX_ITEMS } from "../lib/build-items"
import {
	type BuildViolation,
	findBuildViolations,
} from "../lib/build-violations"
import { ItemSlotsPanel, slotGridClassName } from "./item-slots-panel"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

type SlotsLayout = "panel" | "bar"

const slotsPanel = cva("", {
	variants: {
		layout: { panel: "gap-2.5", bar: "gap-1" } satisfies Record<
			SlotsLayout,
			string
		>,
	},
})

const slotGrid = cva("", {
	variants: {
		layout: {
			panel: slotGridClassName,
			bar: "grid grid-cols-[repeat(6,3rem)] justify-start gap-2",
		} satisfies Record<SlotsLayout, string>,
	},
})

const slotMessages = cva("flex flex-col text-lilac text-xs", {
	variants: {
		layout: {
			panel: "items-center gap-2 text-center empty:-mt-2.5",
			bar: "items-start text-left empty:-mt-1",
		} satisfies Record<SlotsLayout, string>,
	},
})

type ItemSlotsProps = {
	items: readonly Item[]
	onRemoveItem: (slot: number) => void
	/** Why the last item could not be added, announced to screen readers. */
	notice: string | undefined
	/** Screen-reader only: the item just added and how many slots are filled. */
	announcement?: string
	/** `bar`: one row of slots with one-line messages, for the expanded shop's build bar. */
	layout?: SlotsLayout
}

export function ItemSlots({
	items,
	onRemoveItem,
	notice,
	announcement,
	layout = "panel",
}: ItemSlotsProps) {
	const isBar = layout === "bar"
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
		<ItemSlotsPanel className={slotsPanel({ layout })}>
			{!isBar && <BuildHeading gold={totalGold(items)} />}
			<fieldset ref={slotsRef} className={slotGrid({ layout })} tabIndex={-1}>
				<legend className="sr-only">Chosen items</legend>
				{slots.map((slot) => {
					const item = items[slot]
					if (!item) {
						return (
							<div
								key={`empty-${slot}`}
								className="aspect-square rounded-md border-2 border-primary-1 border-dashed bg-primary-4/60"
							/>
						)
					}
					return (
						<ItemButton
							key={`${slot}-${item.id}`}
							item={item}
							className="aspect-square overflow-hidden rounded-md border-2 border-gold/70 bg-primary-2"
							aria-label={`Remove ${item.name}`}
							onClick={(event) => handleRemove(slot, event)}
						>
							<GameIcon
								src={item.icon}
								name={item.name}
								className="size-full"
							/>
						</ItemButton>
					)
				})}
			</fieldset>
			<div
				className={slotMessages({ layout })}
				role="status"
				aria-live="polite"
			>
				{notice && <p>{notice}</p>}
				{!!violations.length &&
					(isBar ? (
						<p className="text-warning">
							Not possible in-game:{" "}
							{violations.map(({ message }) => message).join(" ")}
						</p>
					) : (
						<BuildWarning violations={violations} />
					))}
			</div>
			<PoliteStatus message={announcement ?? ""} />
		</ItemSlotsPanel>
	)
}

function totalGold(items: readonly Item[]) {
	return items.reduce((sum, item) => sum + item.gold.total, 0)
}

function BuildHeading({ gold }: { gold: number }) {
	return (
		<div className="flex items-baseline justify-between">
			<h2 className="font-bold font-display text-base">Build</h2>
			<span className="text-gold text-xs tabular-nums">
				{gold.toLocaleString("en-US")} gold
			</span>
		</div>
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
