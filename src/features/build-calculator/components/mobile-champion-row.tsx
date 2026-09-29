import { GameIcon } from "@/components/common/game-icon"
import type { Champion } from "../../../../scripts/sync-data/schemas/champion"

type MobileChampionRowProps = {
	champion: Pick<Champion, "name" | "icon">
	/** The level control, under the name. */
	children: React.ReactNode
}

export function MobileChampionRow({
	champion,
	children,
}: MobileChampionRowProps) {
	return (
		<div className="flex items-center gap-3">
			<GameIcon
				src={champion.icon}
				name={champion.name}
				className="size-14 rounded-xl border-2 border-gold/70"
			/>
			<div className="flex min-w-0 flex-1 flex-col">
				<h1 className="truncate font-bold font-display text-xl">
					{champion.name}
				</h1>
				{children}
			</div>
		</div>
	)
}
