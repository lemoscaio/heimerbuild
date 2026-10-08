import type { ChampionAbilities } from "@schemas/champion"
import { CircleAlert, RotateCcw } from "lucide-react"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { useSkillActions } from "../hooks/use-skill-actions"
import type { Skills } from "../hooks/use-skills"
import type { AbilityDamageBuild } from "../lib/ability-damage"
import { AbilityDetails } from "./ability-details"
import { SkillOrderGrid } from "./skill-order-grid"
import { SkillOrderList } from "./skill-order-list"
import { SkillPointActions } from "./skill-point-actions"

const ORDER_LAYOUTS = { grid: SkillOrderGrid, list: SkillOrderList }

type SkillsTabProps = {
	abilities: ChampionAbilities
	skills: Skills
	/** `grid`: abilities by levels, as in the game; `list`: a row per level, for phones. */
	layout: keyof typeof ORDER_LAYOUTS
	/** The build each ability's damage is read at; none while it loads. */
	damage?: AbilityDamageBuild
}

/** The detailed view: the whole skill order to edit, then every ability's values per rank. */
export function SkillsTab({
	abilities,
	skills,
	layout,
	damage,
}: SkillsTabProps) {
	const titleId = useId()
	const actions = useSkillActions(skills, abilities)
	const OrderView = ORDER_LAYOUTS[layout]
	const level = skills.spentCount + skills.unspentCount

	return (
		<section
			aria-labelledby={titleId}
			className="flex flex-col gap-4 text-white"
		>
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="flex flex-col gap-0.5">
					<h2 id={titleId} className="font-bold font-display text-base">
						Skill order
					</h2>
					{skills.hasSkillOrder && (
						<p className="text-subtle text-xs">
							Level {level} · {skills.spentCount} spent, {skills.unspentCount}{" "}
							to spend. Pick a cell to put that level's point there, or press a
							spent cell again to remove it; a dashed cell is only a suggestion.
						</p>
					)}
				</div>
				{skills.hasSkillOrder && (
					<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
						<span className="whitespace-nowrap text-subtle">
							Recommended max: {skills.suggestedPriority.join(" › ")}
						</span>
						<SkillPointActions
							size="regular"
							canFill={!!skills.unspentCount}
							canReset={!!skills.spentCount || !!skills.keptCount}
							onFill={actions.fillRecommended}
							onReset={actions.reset}
						/>
					</div>
				)}
			</div>
			{skills.hasSkillOrder && skills.ranks ? (
				<>
					<OrderView
						spells={abilities.spells}
						levels={skills.levels}
						level={level}
						ranks={skills.ranks}
						canPlace={skills.canPlace}
						onPlace={actions.place}
						onRemove={actions.remove}
					/>
					{!!actions.refusal && (
						<p className="flex items-start gap-2 rounded-lg border border-line-strong p-3 text-prose text-xs leading-snug">
							<CircleAlert
								aria-hidden="true"
								className="mt-0.5 size-3.5 shrink-0 text-warning"
							/>
							{actions.refusal}
						</p>
					)}
					{!!skills.keptCount && (
						<p className="flex items-start gap-2 rounded-lg border border-line p-3 text-prose text-xs leading-snug">
							<RotateCcw
								aria-hidden="true"
								className="mt-0.5 size-3.5 shrink-0"
							/>
							<span>
								Kept above level {level}:{" "}
								{skills.levels
									.flatMap((point) =>
										point.state === "kept"
											? [`${point.slot} (level ${point.level})`]
											: [],
									)
									.join(", ")}
								. They come back when you raise the level; any change at level{" "}
								{level} or below drops them.
							</span>
						</p>
					)}
					<OrderLegend />
				</>
			) : (
				<p className="text-prose text-xs">
					This champion's skill points raise stats instead of abilities.
				</p>
			)}
			<h2 className="font-bold font-display text-base">Abilities</h2>
			<AbilityDetails
				abilities={abilities}
				ranks={skills.ranks}
				damage={damage}
			/>
			<PoliteStatus message={actions.announcement} />
		</section>
	)
}

function OrderLegend() {
	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1 text-subtle text-xs">
			<LegendItem swatch="size-3 rounded-sm bg-gold">
				Spent (number = rank)
			</LegendItem>
			<LegendItem swatch="size-3 rounded-sm border border-gold border-dashed">
				Suggested next point (not counted)
			</LegendItem>
			<LegendItem swatch="size-3 rounded-sm border border-line-strong bg-surface-sunken">
				Free: press to spend there
			</LegendItem>
			<LegendItem swatch="size-3 rounded-sm border border-line-strong border-dashed">
				Kept above the level
			</LegendItem>
			<LegendItem swatch="size-3 rounded-sm border border-line bg-hatched">
				Not allowed (rank cap, R before 6)
			</LegendItem>
		</ul>
	)
}

function LegendItem({
	swatch,
	children,
}: {
	swatch: string
	children: React.ReactNode
}) {
	return (
		<li className="flex items-center gap-1.5">
			<span aria-hidden="true" className={swatch} />
			{children}
		</li>
	)
}
