import DotLoader from "react-spinners/DotLoader"

import { ChampionCard } from "../ChampionCard"
import { type } from "os"
import { Champion } from "../../../types/champion"

type ChampionListProps = {
	search: string
	champions: Record<string, Champion>
	filteredChampions: string[]
	isLoadingChampions: boolean
	failedChampionsLoad: boolean
	loadChampions: () => void
}

export function ChampionList(props: ChampionListProps) {
	const {
		search,
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
					{search.length === 0
						? Object.keys(champions).map((championName) => {
								const champion = champions[championName]
								return (
									<ChampionCard
										key={champion.id}
										champion={champion}
									></ChampionCard>
								)
						  })
						: filteredChampions.map((championName) => {
								const champion = champions[championName]
								return (
									<ChampionCard
										key={champion.id}
										champion={champion}
									></ChampionCard>
								)
						  })}
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
