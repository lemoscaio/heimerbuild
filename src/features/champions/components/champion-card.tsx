import { useNavigate } from "react-router-dom"

type ChampionCardProps = {
	champion: {
		key: string
		name: string
		icon: string
	}
}

export function ChampionCard(props: ChampionCardProps) {
	const navigate = useNavigate()

	function handleClick(championName: string) {
		navigate(`/champions/${championName}`)
	}

	return (
		<article
			className="champion-card"
			onClick={() => handleClick(props.champion.key)}
		>
			<img
				src={`${props.champion.icon}`}
				alt=""
				className="champion-card__image"
			/>
			<h3 className="champion-card__name">{props.champion.name}</h3>
		</article>
	)
}
