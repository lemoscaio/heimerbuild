import { X } from "lucide-react"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { Button } from "@/components/ui/button"
import { itemStatLines } from "@/lib/item-stats"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { useEscapeKey } from "../hooks/use-escape-key"
import { MAX_ITEMS } from "../lib/build-items"

type ItemDetailsCardProps = {
	item: Item
	/** Disables Add to build and says why. */
	isBuildFull: boolean
	onAdd: (itemId: string) => void
	onClose: () => void
}

/** The selected shop item: what it gives, and the button that adds it. */
export function ItemDetailsCard({
	item,
	isBuildFull,
	onAdd,
	onClose,
}: ItemDetailsCardProps) {
	const id = useId()
	const statLines = itemStatLines(item.stats)
	useEscapeKey(onClose)

	return (
		<section
			aria-labelledby={`${id}-name`}
			className="flex flex-col gap-2.5 rounded-xl border border-lilac bg-primary-2 p-4"
		>
			<div className="flex items-center gap-3">
				<GameIcon
					src={item.icon}
					name={item.name}
					className="size-11 rounded-lg border-2 border-gold/70"
				/>
				<div className="flex min-w-0 flex-1 flex-col gap-0.5">
					<h2 id={`${id}-name`} className="font-bold font-display text-base">
						{item.name}
					</h2>
					<span className="text-gold text-xs tabular-nums">
						{item.gold.total.toLocaleString("en-US")} gold
					</span>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					aria-label="Close item details"
					onClick={onClose}
				>
					<X />
				</Button>
			</div>
			{!!statLines.length && (
				<ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
					{statLines.map(({ stat, value, label }) => (
						<li key={stat}>
							<span className="font-bold text-success">{value}</span> {label}
						</li>
					))}
				</ul>
			)}
			<Button
				type="button"
				className="w-full bg-lilac text-primary-4 hover:bg-lilac/85"
				disabled={isBuildFull}
				aria-describedby={isBuildFull ? `${id}-full` : undefined}
				onClick={() => onAdd(item.id)}
			>
				Add to build
			</Button>
			{isBuildFull && (
				<p id={`${id}-full`} className="text-center text-lilac text-xs">
					All {MAX_ITEMS} item slots are full. Remove an item first.
				</p>
			)}
		</section>
	)
}
