import { Skeleton } from "@/components/ui/skeleton"
import { MAX_ITEMS } from "../lib/build-items"
import { ItemSlotsPanel } from "./item-slots-panel"
import { LevelRowLayout } from "./level-row-layout"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

/** Placeholders for the level selector and the item slots. */
export function BuildSkeleton() {
	return (
		<>
			<LevelRowLayout>
				<Skeleton className="h-8 w-35 shrink-0" />
				<Skeleton className="h-2 w-full max-w-75" />
			</LevelRowLayout>
			<ItemSlotsPanel>
				<div className="flex justify-center gap-1.5">
					{slots.map((slot) => (
						<Skeleton key={slot} className="size-10 rounded-sm" />
					))}
				</div>
				<div className="min-h-5" />
			</ItemSlotsPanel>
		</>
	)
}
