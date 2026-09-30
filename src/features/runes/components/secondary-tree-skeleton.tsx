import { cn } from "@/lib/cn"
import { RAIL_LABEL_CLASSES } from "../lib/rune-styles"
import { RuneRail } from "./rune-rail"
import { RuneRailRow } from "./rune-rail-row"
import { RuneRailSkeleton } from "./rune-rail-skeleton"
import { RuneRowSkeleton } from "./rune-row-skeleton"

const ROWS = 3
const RUNES_PER_ROW = 3

/** The secondary tree's caption and three rows, empty, until a tree is chosen. */
export function SecondaryTreeSkeleton() {
	return (
		<RuneRailSkeleton>
			<div className="flex flex-col gap-2">
				<p className={cn("ml-7.5", RAIL_LABEL_CLASSES)}>Pick 2</p>
				<RuneRail>
					{Array.from({ length: ROWS }, (_, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
						<RuneRailRow key={index} isPicked={false}>
							<RuneRowSkeleton size="rune" count={RUNES_PER_ROW} />
						</RuneRailRow>
					))}
				</RuneRail>
			</div>
		</RuneRailSkeleton>
	)
}
