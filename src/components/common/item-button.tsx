import type { Item } from "@schemas/item"
import { useId, useState } from "react"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { ItemStatList } from "./item-stat-list"

type ItemButtonProps = {
	item: Item
	/** A line under the name in the details ("Upgrade of Manamune · 360 Manaflow"). */
	note?: string
} & React.ComponentProps<"button">

/** A button for one item (its icon as children) that shows the item's details in a tooltip. */
export function ItemButton({
	item,
	note,
	children,
	className,
	onPointerUp,
	"aria-describedby": describedBy,
	...props
}: ItemButtonProps) {
	const tooltipId = useId()
	const [open, setOpen] = useState(false)

	return (
		<Tooltip open={open} onOpenChange={setOpen}>
			<TooltipTrigger
				type="button"
				// Clicking adds or removes the item; the details stay open while hovered.
				closeOnClick={false}
				aria-describedby={
					[describedBy, open && tooltipId].filter(Boolean).join(" ") ||
					undefined
				}
				// The focus ring (app.css) is drawn outside the tile, never over the item art.
				className={cn("relative block p-0", className)}
				onPointerUp={(event) => {
					// Base UI tooltips ignore touch; a tap shows the details (and still clicks).
					if (event.pointerType !== "mouse") setOpen(true)
					onPointerUp?.(event)
				}}
				{...props}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent id={tooltipId}>
				<ItemDetails item={item} note={note} />
			</TooltipContent>
		</Tooltip>
	)
}

function ItemDetails({ item, note }: { item: Item; note?: string }) {
	return (
		<div className="flex flex-col gap-1.5">
			<p className="font-bold text-sm">{item.name}</p>
			{note && <p className="text-lilac">{note}</p>}
			<p className="text-gold">
				{item.gold.total.toLocaleString("en-US")} gold
			</p>
			<ItemStatList stats={item.stats} />
			{item.plaintext && <p className="text-lilac italic">{item.plaintext}</p>}
			{item.description && (
				<p className="whitespace-pre-line text-prose">{item.description}</p>
			)}
		</div>
	)
}
