import { ABILITY_SLOTS, type Champion } from "@schemas/champion"
import { StatChangeList } from "@/features/build-calculator/components/stat-change-list"
import { SkillsRow } from "@/features/skills/components/skills-row"
import type { BuildPage } from "./hooks/use-build-page"

type ChampionSkillsProps = {
	build: BuildPage
	champion: Champion
}

/** The skills row, with what one more rank changes on the stats panel in each ability's tooltip. */
export function ChampionSkills({ build, champion }: ChampionSkillsProps) {
	const statChanges = Object.fromEntries(
		ABILITY_SLOTS.flatMap((slot) => {
			const preview = build.rankUpStats(slot)
			return preview
				? [
						[
							slot,
							<StatChangeList
								key={slot}
								stats={preview.stats}
								next={preview.next}
							/>,
						],
					]
				: []
		}),
	)

	return (
		<SkillsRow
			abilities={champion.abilities}
			skills={build.skills}
			statChanges={statChanges}
		/>
	)
}
