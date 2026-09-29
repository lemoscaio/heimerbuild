type ChampionBrowserTitleProps = {
	/** Both known once the champions load. */
	championCount?: number
	patch?: string
}

export function ChampionBrowserTitle({
	championCount,
	patch,
}: ChampionBrowserTitleProps) {
	return (
		<div className="flex flex-col gap-2">
			<h1 className="font-bold font-display text-4xl text-white lg:text-5xl">
				Pick a champion
			</h1>
			<p className="text-prose">
				Build items, set a level and share the link.
				{!!championCount &&
					!!patch &&
					` ${championCount} champions on patch ${patch}.`}
			</p>
		</div>
	)
}
