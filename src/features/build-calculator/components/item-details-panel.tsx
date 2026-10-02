import type { Item } from "@schemas/item"
import { X } from "lucide-react"
import { useId } from "react"
import { ItemStatList } from "@/components/common/item-stat-list"
import { Button } from "@/components/ui/button"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import { useEscapeKey } from "../hooks/use-escape-key"
import { AddToBuildButton } from "./add-to-build-button"
import { ItemSummary } from "./item-summary"
import { StatChangeList } from "./stat-change-list"

type ItemDetailsPanelProps = {
	/** The selected item; without one the panel says how to pick one. */
	item: Item | undefined
	stats: ComputedStats | undefined
	/** The stats with `item` added. */
	next: ComputedStats | undefined
	isBuildFull: boolean
	onAdd: (itemId: string) => void
	onClose: () => void
}

/** The expanded shop's details column: the item in full and what it changes. */
export function ItemDetailsPanel({
	item,
	stats,
	next,
	isBuildFull,
	onAdd,
	onClose,
}: ItemDetailsPanelProps) {
	const headingId = useId()
	useEscapeKey(onClose)

	if (!item || !stats || !next) {
		return (
			<p className="m-auto max-w-60 text-center text-subtle">
				Select an item to see what it gives and how it changes your stats.
			</p>
		)
	}

	return (
		<section
			aria-labelledby={headingId}
			className="flex min-h-full flex-col gap-4 text-sm"
		>
			<ItemSummary item={item} headingId={headingId} size="lg">
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="self-start"
					aria-label="Close item details"
					onClick={onClose}
				>
					<X />
				</Button>
			</ItemSummary>
			<ItemStatList stats={item.stats} layout="table" />
			{item.plaintext && <p className="text-lilac italic">{item.plaintext}</p>}
			{item.description && (
				<p className="whitespace-pre-line text-prose text-xs leading-relaxed">
					{item.description}
				</p>
			)}
			<div className="flex flex-col gap-1.5">
				<h3 className="font-semibold text-gold text-xs uppercase tracking-widest">
					If you add it
				</h3>
				<StatChangeList stats={stats} next={next} />
			</div>
			<AddToBuildButton
				className="mt-auto"
				itemId={item.id}
				isBuildFull={isBuildFull}
				onAdd={onAdd}
			/>
		</section>
	)
}
