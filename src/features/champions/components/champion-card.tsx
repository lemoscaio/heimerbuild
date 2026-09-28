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
			className="group rounded-lg"
			onClick={() => track("champion_selected", { champion: champion.key })}
		>
			<ChampionCardShell className="transition group-hover:scale-110 group-hover:ring-lilac/60">
				<GameIcon
					src={champion.icon}
					name={champion.name}
					width={60}
					height={60}
					loading="lazy"
					className="size-15 rounded-md"
				/>
				<h3 className="w-full text-center text-xs leading-tight tracking-tight">
					{champion.name}
				</h3>
			</ChampionCardShell>
		</Link>
	)
}
