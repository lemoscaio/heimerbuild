import { LoadError } from "@/components/common/load-error"
import type { ChampionSummary } from "../../../../scripts/sync-data/schemas/champion"
import { ChampionCard } from "./champion-card"
import { ChampionGrid } from "./champion-grid"
import { ChampionGridSkeleton } from "./champion-grid-skeleton"

type ChampionListProps = {
	champions: ChampionSummary[] | undefined
	filteredChampions: ChampionSummary[]
	isLoadingChampions: boolean
	failedChampionsLoad: boolean
	loadChampions: () => void
}

export function ChampionList(props: ChampionListProps) {
	const {
		champions,
		filteredChampions,
		isLoadingChampions,
		failedChampionsLoad,
		loadChampions,
	} = props

	function handleLoadChampionsClick() {
		loadChampions()
	}

	return (
		<>
			{champions && (
				<ChampionGrid>
					{filteredChampions.length > 0 ? (
						filteredChampions.map((champion) => (
							<ChampionCard
								key={champion.id}
								champion={champion}
							></ChampionCard>
						))
					) : (
						<p className="col-span-full py-8 text-center text-prose">
							No champions found.
						</p>
					)}
				</ChampionGrid>
			)}
			{isLoadingChampions && <ChampionGridSkeleton />}
			{failedChampionsLoad && (
				<ChampionGrid>
					<LoadError
						className="col-span-full py-8"
						onRetry={handleLoadChampionsClick}
					>
						Could not load the champions. Check your connection.
					</LoadError>
				</ChampionGrid>
			)}
		</>
	)
}
