import type { Champion } from "../../../../scripts/sync-data/schemas/champion"
import { attackTypeLabels, roleLabels } from "../lib/champion-labels"

type ChampionHeaderProps = {
	champion: Pick<
		Champion,
		"name" | "title" | "icon" | "roles" | "attackType" | "lore"
	>
	/** Page actions shown at the end of the header, such as sharing the build. */
	children?: React.ReactNode
}

export function ChampionHeader({ champion, children }: ChampionHeaderProps) {
	return (
		<>
			<div className="champion-info__header">
				<img
					src={champion.icon}
					alt=""
					className="champion-info__header-image"
				/>
				<div className="champion-info__name-title">
					<h3 className="champion-info__name">{champion.name}</h3>
					<h4 className="champion-info__title">{champion.title}</h4>
					<p className="champion-info__traits">
						<span>
							{champion.roles.map((role) => roleLabels[role]).join(", ")}
						</span>
						<span aria-hidden="true"> · </span>
						<span>{attackTypeLabels[champion.attackType]}</span>
					</p>
				</div>
				{children && (
					<div className="champion-info__header-actions">{children}</div>
				)}
			</div>
			<details className="champion-info__lore">
				<summary className="champion-info__lore-toggle">Lore</summary>
				<p className="champion-info__lore-text">{champion.lore}</p>
			</details>
		</>
	)
}
