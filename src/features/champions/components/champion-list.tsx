import type { ChampionSummary } from "@schemas/champion"
import { LoadError } from "@/components/common/load-error"
import { ChampionCard } from "./champion-card"
import { ChampionGrid } from "./champion-grid"
import { ChampionGridSkeleton } from "./champion-grid-skeleton"
import { ChampionCardReveal, ChampionGridReveal } from "./champion-list.motion"

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
				<ChampionGridReveal>
					{filteredChampions.length > 0 ? (
						filteredChampions.map((champion, index) => (
							<ChampionCardReveal key={champion.id} index={index}>
								<ChampionCard champion={champion} />
							</ChampionCardReveal>
						))
					) : (
						<p className="col-span-full py-8 text-center text-prose">
							No champions found.
						</p>
					)}
				</ChampionGridReveal>
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
