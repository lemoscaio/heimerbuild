import { RAIL_LABEL_CLASSES } from "../lib/rune-styles"
import { RuneRail } from "./rune-rail"
import { RuneRailRow } from "./rune-rail-row"
import { RuneRailSkeleton } from "./rune-rail-skeleton"
import { RuneRowSkeleton } from "./rune-row-skeleton"

const ROWS = 3
const RUNES_PER_ROW = 3

/** The primary tree's keystone row and three rows, empty, until a tree is chosen. */
export function PrimaryTreeSkeleton() {
	return (
		<RuneRailSkeleton hint="Choose a primary tree.">
			<RuneRail>
				<RuneRailRow isPicked={false}>
					<p className={RAIL_LABEL_CLASSES}>Keystones</p>
					<RuneRowSkeleton size="keystone" count={RUNES_PER_ROW} />
				</RuneRailRow>
				{Array.from({ length: ROWS }, (_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
					<RuneRailRow key={index} isPicked={false}>
						<RuneRowSkeleton size="rune" count={RUNES_PER_ROW} />
					</RuneRailRow>
				))}
			</RuneRail>
		</RuneRailSkeleton>
	)
}
