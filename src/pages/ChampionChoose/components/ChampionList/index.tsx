import DotLoader from "react-spinners/DotLoader"

import type { Champion } from "../../../../types/champion"
import type { Champions } from "../../../../types/champions"
import { ChampionCard } from "../ChampionCard"

type ChampionListProps = {
	champions: Champions | undefined
	filteredChampions: Champion[]
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
			{isLoadingChampions && (
				<div className="champions-list">
					<DotLoader color={"white"} className="champions-list__loader" />
				</div>
			)}
			{failedChampionsLoad && (
				<div className="champions-list">
					<div className="champions-list__load-error-container load-error-container">
						<p>Something went wrong!</p>
						<button
							className="champions-list__load-button load-button"
							onClick={handleLoadChampionsClick}
						>
							Click here to try again
						</button>
					</div>
				</div>
			)}
		</>
	)
}
