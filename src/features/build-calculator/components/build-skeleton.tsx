import { Skeleton } from "@/components/ui/skeleton"
import { MAX_ITEMS } from "../lib/build-items"

const slots = Array.from({ length: MAX_ITEMS }, (_, index) => index)

/** Placeholders for the level selector and the item slots. */
export function BuildSkeleton() {
	return (
		<>
			<div className="champion-info__level-container level-container">
				<Skeleton className="skeleton--text" />
				<Skeleton className="skeleton--slider" />
			</div>
			<div className="champion-info__chosen-items chosen-items">
				<div className="chosen-items__slots">
					{slots.map((slot) => (
						<Skeleton key={slot} className="chosen-items__item" />
					))}
				</div>
				<p className="chosen-items__notice" />
			</div>
		</>
	)
}
