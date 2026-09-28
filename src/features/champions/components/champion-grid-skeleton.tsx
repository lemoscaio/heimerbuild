import { Skeleton } from "@/components/ui/skeleton"
import { ChampionCardShell } from "./champion-card-shell"
import { ChampionGrid } from "./champion-grid"

const placeholders = Array.from({ length: 30 }, (_, index) => index)

export function ChampionGridSkeleton() {
	return (
		<ChampionGrid role="status">
			<span className="sr-only">Loading champions</span>
			{placeholders.map((index) => (
				<ChampionCardShell key={index}>
					<Skeleton className="size-15" />
					<Skeleton className="h-2.5 w-12" />
				</ChampionCardShell>
			))}
		</ChampionGrid>
	)
}
