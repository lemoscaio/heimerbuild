import type { Champion } from "@schemas/champion"

type MobileChampionRowProps = {
	champion: Pick<Champion, "name">
	/** The portrait, such as the button that switches the champion. */
	avatar: React.ReactNode
	/** Next to the portrait, such as the summoner spell slots. */
	beside?: React.ReactNode
	/** Under the name, such as the incomplete-champion notice. */
	note?: React.ReactNode
	/** The level control, under the name. */
	children: React.ReactNode
}

export function MobileChampionRow({
	champion,
	avatar,
	beside,
	note,
	children,
}: MobileChampionRowProps) {
	return (
		<div className="flex items-center gap-3">
			{avatar}
			{beside}
			<div className="flex min-w-0 flex-1 flex-col">
				<h1 className="truncate font-bold font-display text-xl">
					{champion.name}
				</h1>
				{note}
				{children}
			</div>
		</div>
	)
}
