import type { Item } from "@schemas/item"
import { X } from "lucide-react"
import { useId } from "react"
import { ItemStatList } from "@/components/common/item-stat-list"
import { Button } from "@/components/ui/button"
import { useEscapeKey } from "../hooks/use-escape-key"
import { AddToBuildButton } from "./add-to-build-button"
import { ItemSummary } from "./item-summary"

type ItemDetailsCardProps = {
	item: Item
	/** What the item is beyond its price: an upgrade's base item and count. */
	note?: string
	isBuildFull: boolean
	onAdd: (itemId: string) => void
	onClose: () => void
}

/** The selected shop item: what it gives, and the button that adds it. */
export function ItemDetailsCard({
	item,
	note,
	isBuildFull,
	onAdd,
	onClose,
}: ItemDetailsCardProps) {
	const headingId = useId()
	useEscapeKey(onClose)

	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-2.5 rounded-xl border border-lilac bg-line p-4"
		>
			<ItemSummary item={item} headingId={headingId} note={note}>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="max-lg:size-11"
					aria-label="Close item details"
					onClick={onClose}
				>
					<X />
				</Button>
			</ItemSummary>
			<ItemStatList stats={item.stats} layout="inline" />
			<AddToBuildButton
				itemId={item.id}
				isBuildFull={isBuildFull}
				onAdd={onAdd}
			/>
		</section>
	)
}
