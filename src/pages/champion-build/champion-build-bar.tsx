import type { Champion } from "@schemas/champion"
import { BuildBar } from "@/features/build-calculator/components/build-bar"
import type { BuildPage } from "./hooks/use-build-page"

type ChampionBuildBarProps = {
	build: BuildPage
	champion: Champion
}

/** The expanded screens' bottom bar on the page's build: champion, level, items and key stats. */
export function ChampionBuildBar({ build, champion }: ChampionBuildBarProps) {
	const { championState, items, stats } = build
	if (!stats) return null
	return (
		<BuildBar
			champion={champion}
			formName={championState.form?.name}
			level={championState.level}
			onLevelChange={championState.setLevel}
			items={items.list}
			onRemoveItem={items.remove}
			notice={items.notice}
			announcement={items.announcement}
			stats={stats}
		/>
	)
}
