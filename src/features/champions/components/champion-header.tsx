import type { Champion } from "../../../../scripts/sync-data/schemas/champion"

type ChampionHeaderProps = {
	champion: Pick<Champion, "name" | "title" | "icon">
}

export function ChampionHeader({ champion }: ChampionHeaderProps) {
	return (
		<div className="champion-info__header">
			<img src={champion.icon} alt="" className="champion-info__header-image" />
			<div className="champion-info__name-title">
				<h3 className="champion-info__name">{champion.name}</h3>
				<h4 className="champion-info__title">{champion.title}</h4>
			</div>
		</div>
	)
}
