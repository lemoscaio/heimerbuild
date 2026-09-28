import { useId, useState } from "react"
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/cn"
import { itemStatLines } from "@/lib/item-stats"
import type { Item } from "../../../scripts/sync-data/schemas/item"

type ItemButtonProps = {
	item: Item
} & React.ComponentProps<"button">

/** A button for one item (its icon as children) that shows the item's details in a tooltip. */
export function ItemButton({
	item,
	children,
	className,
	onPointerUp,
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
				aria-describedby={open ? tooltipId : undefined}
				// The ring is drawn on an overlay: the icon tile is positioned and would cover an outline.
				className={cn(
					"relative block p-0 after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ring focus-visible:after:-outline-offset-2",
					className,
				)}
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
				<ItemDetails item={item} />
			</TooltipContent>
		</Tooltip>
	)
}

function ItemDetails({ item }: { item: Item }) {
	const statLines = itemStatLines(item.stats)

	return (
		<div className="flex flex-col gap-1.5">
			<p className="font-bold text-sm">{item.name}</p>
			<p className="text-gold">
				{item.gold.total.toLocaleString("en-US")} gold
			</p>
			{!!statLines.length && (
				<ul>
					{statLines.map(({ stat, value, label }) => (
						<li key={stat}>
							<span className="font-bold text-success">{value}</span> {label}
						</li>
					))}
				</ul>
			)}
			{item.plaintext && <p className="text-lilac italic">{item.plaintext}</p>}
			{item.description && (
				<p className="whitespace-pre-line text-prose">{item.description}</p>
			)}
		</div>
	)
}
