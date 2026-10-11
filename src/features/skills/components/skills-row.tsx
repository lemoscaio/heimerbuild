import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { PoliteStatus } from "@/components/common/polite-status"
import { cn } from "@/lib/cn"
import { useSkillActions } from "../hooks/use-skill-actions"
import type { Skills } from "../hooks/use-skills"
import { pointSpells } from "../lib/point-spells"
import { AbilityRankButton } from "./ability-rank-button"
import { SkillOrderStrip } from "./skill-order-strip"
import { SkillPointActions } from "./skill-point-actions"

type SkillsRowProps = {
	abilities: ChampionAbilities
	skills: Skills
	/** What one more rank changes on the stats panel, for the abilities whose rank grants stats. */
	statChanges?: Partial<Record<AbilitySlot, React.ReactNode>>
} & Omit<React.ComponentProps<"section">, "children">

/** The champion's passive and abilities with their ranks, and the skill order below them. */
export function SkillsRow({
	abilities,
	skills,
	statChanges,
	className,
	...props
}: SkillsRowProps) {
	const titleId = useId()
	const spells = pointSpells(abilities.spells, {
		slots: skills.pointSlots,
		statPoints: skills.statPoints,
	})
	const row = useSkillActions(skills, spells)

	return (
		<section
			aria-labelledby={titleId}
			className={cn("flex flex-col gap-2.5 text-white", className)}
			{...props}
		>
			<div className="flex items-baseline justify-between gap-2 text-xs">
				<h2 id={titleId} className="text-prose text-sm">
					Skills
				</h2>
				{!!skills.ranks && <PointsToSpend count={skills.unspentCount} />}
			</div>
			{!!skills.ranks && (
				<>
					<div className="flex items-start justify-between gap-1">
						<div className="flex flex-col items-center gap-1">
							<GameIcon
								src={abilities.passive.icon}
								name={abilities.passive.name}
								className="size-9 rounded-lg border border-line"
							/>
							<span className="text-[10px] text-subtle">Passive</span>
						</div>
						{spells.map((spell) => (
							<AbilityRankButton
								key={spell.slot}
								spell={spell}
								rank={skills.ranks?.[spell.slot] ?? 0}
								isSuggested={skills.suggestion === spell.slot}
								blocker={skills.spendBlocker(spell.slot)}
								pointLevel={skills.spendLevel(spell.slot)}
								onSpend={() => row.spend(spell.slot)}
								statChanges={statChanges?.[spell.slot]}
							/>
						))}
					</div>
					<SkillOrderStrip
						levels={skills.levels}
						spells={spells}
						canPlace={skills.canPlace}
						onPlace={row.place}
						removeBlocker={skills.removeBlocker}
						onRemove={row.remove}
					>
						<SkillPointActions
							size="compact"
							canFill={!!skills.unspentCount}
							canReset={!!skills.spentCount || !!skills.keptCount}
							onFill={row.fillRecommended}
							onReset={row.reset}
						/>
					</SkillOrderStrip>
					<p className="text-subtle text-xs leading-snug">
						Press {skills.statPoints ? "a stat" : "an ability"} to spend a
						point, or a level to choose or remove its point. A dashed outline is
						only a suggestion.
					</p>
				</>
			)}
			<PoliteStatus message={row.announcement} />
		</section>
	)
}

/** The points left to spend, as the game counts them. */
function PointsToSpend({ count }: { count: number }) {
	return count ? (
		<span className="font-bold text-lilac">
			{count} {count === 1 ? "point" : "points"} to spend
		</span>
	) : (
		<span className="text-subtle">All points spent</span>
	)
}
