import { Link } from "@tanstack/react-router"

type ChampionCardProps = {
	champion: {
		key: string
		name: string
		icon: string
	}
}

export function ChampionCard({ champion }: ChampionCardProps) {
	return (
		<Link
			to="/champions/$key"
			params={{ key: champion.key }}
			className="champion-card"
		>
			<img src={champion.icon} alt="" className="champion-card__image" />
			<h3 className="champion-card__name">{champion.name}</h3>
		</Link>
	)
}
