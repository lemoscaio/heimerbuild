import type { ChampionSummary } from "../../../../scripts/sync-data/schemas/champion"
import { ChampionCard } from "./champion-card"
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
				<div className="champions-list">
					{filteredChampions.length > 0 ? (
						filteredChampions.map((champion) => (
							<ChampionCard
								key={champion.id}
								champion={champion}
							></ChampionCard>
						))
					) : (
						<p>No champions found.</p>
					)}
				</div>
			)}
			{isLoadingChampions && <ChampionGridSkeleton />}
			{failedChampionsLoad && (
				<div className="champions-list">
					<div
						className="champions-list__load-error-container load-error-container"
						role="alert"
					>
						<p>Could not load the champions. Check your connection.</p>
						<button
							type="button"
							className="champions-list__load-button load-button"
							onClick={handleLoadChampionsClick}
						>
							Try again
						</button>
					</div>
				</div>
			)}
		</>
	)
}
