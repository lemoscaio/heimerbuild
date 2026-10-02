import { ABILITY_SLOTS, type ChampionAbilities } from "@schemas/champion"
import { StatChangeList } from "@/features/build-calculator/components/stat-change-list"
import { SkillsRow } from "@/features/skills/components/skills-row"
import type { Skills } from "@/features/skills/hooks/use-skills"
import type { BuildPage } from "./hooks/use-build-page"

type ChampionSkillsProps = {
	abilities: ChampionAbilities
	skills: Skills
	rankUpStats: BuildPage["rankUpStats"]
}

/** The skills row, with what one more rank changes on the stats panel in each ability's tooltip. */
export function ChampionSkills({
	abilities,
	skills,
	rankUpStats,
}: ChampionSkillsProps) {
	const statChanges = Object.fromEntries(
		ABILITY_SLOTS.flatMap((slot) => {
			const preview = rankUpStats(slot)
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
			abilities={abilities}
			skills={skills}
			statChanges={statChanges}
		/>
	)
}
