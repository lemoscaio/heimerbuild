import { Skeleton } from "@/components/ui/skeleton"
import { MAX_ITEMS } from "../lib/build-items"
import { ItemSlotsPanel, slotGridClassName } from "./item-slots-panel"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

export function ItemSlotsSkeleton() {
	return (
		<ItemSlotsPanel>
			<Skeleton className="h-6 w-full" />
			<div className={slotGridClassName}>
				{slots.map((slot) => (
					<Skeleton key={slot} className="aspect-square rounded-md" />
				))}
			</div>
		</ItemSlotsPanel>
	)
}
