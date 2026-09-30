import { Skeleton } from "@/components/ui/skeleton"
import { ChampionCardShell } from "./champion-card-shell"
import { ChampionGrid } from "./champion-grid"

const placeholders = Array.from({ length: 40 }, (_, index) => index)

export function ChampionGridSkeleton() {
	return (
		<ChampionGrid role="status">
			<span className="sr-only">Loading champions</span>
			{placeholders.map((index) => (
				<ChampionCardShell key={index}>
					<Skeleton className="aspect-square w-full rounded-xl" />
					<Skeleton className="h-3 w-3/4" />
				</ChampionCardShell>
			))}
		</ChampionGrid>
	)
}
