import { Link } from "@tanstack/react-router"
import { GameIcon } from "@/components/common/game-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { track } from "@/lib/analytics/analytics"

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
			<CardCell>
				<GameIcon
					src={champion.icon}
					name={champion.name}
					width={120}
					height={120}
					loading="lazy"
					className="aspect-square w-full rounded-xl ring-1 ring-line transition group-hover:scale-105 group-hover:ring-lilac"
				/>
				<span className="w-full truncate text-center text-prose text-xs group-hover:text-white">
					{champion.name}
				</span>
			</CardCell>
		</Link>
	)
}

/** The card's loading placeholder: the same cell, so the grid keeps its size. */
export function ChampionCardSkeleton() {
	return (
		<CardCell>
			<Skeleton className="aspect-square w-full rounded-xl" />
			<Skeleton className="h-3 w-3/4" />
		</CardCell>
	)
}

/** One grid cell: the icon over the name. */
function CardCell(props: React.ComponentProps<"div">) {
	return (
		<div className="flex min-w-0 flex-col items-center gap-1.5" {...props} />
	)
}
