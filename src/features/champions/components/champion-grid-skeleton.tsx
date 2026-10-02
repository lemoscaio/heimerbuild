import { ChampionCardSkeleton } from "./champion-card"
import { ChampionGrid } from "./champion-grid"

const placeholders = Array.from({ length: 40 }, (_, index) => index)

export function ChampionGridSkeleton() {
	return (
		<ChampionGrid role="status">
			<span className="sr-only">Loading champions</span>
			{placeholders.map((index) => (
				<ChampionCardSkeleton key={index} />
			))}
		</ChampionGrid>
	)
}
