import type { Item } from "@schemas/item"
import { X } from "lucide-react"
import { useId } from "react"
import { Button } from "@/components/ui/button"
import { itemStatLines } from "@/lib/item-stats"
import { useEscapeKey } from "../hooks/use-escape-key"
import { AddToBuildButton } from "./add-to-build-button"
import { ItemSummary } from "./item-summary"

type ItemDetailsCardProps = {
	item: Item
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
	const headingId = useId()
	const statLines = itemStatLines(item.stats)
	useEscapeKey(onClose)

	return (
		<section
			aria-labelledby={headingId}
			className="flex flex-col gap-2.5 rounded-xl border border-lilac bg-primary-2 p-4"
		>
			<ItemSummary item={item} headingId={headingId}>
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
			{!!statLines.length && (
				<ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
					{statLines.map(({ stat, value, label }) => (
						<li key={stat}>
							<span className="font-bold text-success">{value}</span> {label}
						</li>
					))}
				</ul>
			)}
			<AddToBuildButton
				itemId={item.id}
				isBuildFull={isBuildFull}
				onAdd={onAdd}
			/>
		</section>
	)
}
