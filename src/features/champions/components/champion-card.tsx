import { Link } from "@tanstack/react-router"
import { GameIcon } from "@/components/common/game-icon"
import { track } from "@/lib/analytics/analytics"
import { ChampionCardShell } from "./champion-card-shell"

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
			className="group block min-w-0 rounded-lg"
			onClick={() => track("champion_selected", { champion: champion.key })}
		>
			<ChampionCardShell>
				<GameIcon
					src={champion.icon}
					name={champion.name}
					width={120}
					height={120}
					loading="lazy"
					className="aspect-square w-full rounded-xl ring-1 ring-primary-2 transition group-hover:scale-105 group-hover:ring-lilac"
				/>
				<span className="w-full truncate text-center text-prose text-xs group-hover:text-white">
					{champion.name}
				</span>
			</ChampionCardShell>
		</Link>
	)
}
