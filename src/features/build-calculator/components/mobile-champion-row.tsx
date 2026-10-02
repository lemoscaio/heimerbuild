import type { Champion } from "@schemas/champion"
import { GameIcon } from "@/components/common/game-icon"

type MobileChampionRowProps = {
	champion: Pick<Champion, "name" | "icon">
	/** The selected form's name, over the portrait, for a champion with forms. */
	formName?: string
	/** Next to the portrait, such as the summoner spell slots. */
	beside?: React.ReactNode
	/** The level control, under the name. */
	children: React.ReactNode
}

export function MobileChampionRow({
	champion,
	formName,
	beside,
	children,
}: MobileChampionRowProps) {
	return (
		<div className="flex items-center gap-3">
			<GameIcon
				src={champion.icon}
				name={champion.name}
				caption={formName}
				className="size-14 rounded-xl border-2 border-gold/70"
			/>
			{beside}
			<div className="flex min-w-0 flex-1 flex-col">
				<h1 className="truncate font-bold font-display text-xl">
					{champion.name}
				</h1>
				{children}
			</div>
		</div>
	)
}
