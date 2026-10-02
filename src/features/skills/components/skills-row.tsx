import type { AbilitySlot, ChampionAbilities } from "@schemas/champion"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { PoliteStatus } from "@/components/common/polite-status"
import { cn } from "@/lib/cn"
import { useSkillActions } from "../hooks/use-skill-actions"
import type { Skills } from "../hooks/use-skills"
import { AbilityRankButton } from "./ability-rank-button"
import { SkillOrderStrip } from "./skill-order-strip"

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
	const row = useSkillActions(skills, abilities)
	const autoCount = skills.points.filter((point) => point.isAuto).length

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
				{skills.hasSkillOrder && (
					<span className="text-subtle">
						{skills.pickedCount} picked
						{!!autoCount && (
							<>
								<span aria-hidden="true"> · </span>
								<span className="text-gold">{autoCount} auto</span>
							</>
						)}
					</span>
				)}
			</div>
			{skills.hasSkillOrder && skills.ranks ? (
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
						{abilities.spells.map((spell) => (
							<AbilityRankButton
								key={spell.slot}
								spell={spell}
								rank={skills.ranks?.[spell.slot] ?? 0}
								autoRanks={
									skills.points.filter(
										(point) => point.isAuto && point.slot === spell.slot,
									).length
								}
								blocker={skills.spendBlocker(spell.slot)}
								onSpend={() => row.spend(spell.slot)}
								statChanges={statChanges?.[spell.slot]}
							/>
						))}
					</div>
					<SkillOrderStrip
						points={skills.points}
						keptPicks={skills.keptPicks}
						spells={abilities.spells}
						hasPicks={!!skills.pickedCount || !!skills.keptPicks.length}
						canPlace={skills.canPlace}
						onPlace={row.place}
						onReset={row.reset}
					/>
					<p className="text-subtle text-xs leading-snug">
						Press an ability for the next point, or a level to change it. Dashed
						points are automatic.
					</p>
				</>
			) : (
				<p className="text-prose text-xs leading-snug">
					This champion's skill points raise stats instead of abilities.
				</p>
			)}
			<PoliteStatus message={row.announcement} />
		</section>
	)
}
