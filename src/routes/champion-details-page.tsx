import { useParams } from "react-router-dom"
import { ChampionDetails } from "@/features/build-calculator/components/champion-details"

export function ChampionDetailsPage() {
	const { championKey } = useParams()

	return <ChampionDetails championKey={championKey} />
}
