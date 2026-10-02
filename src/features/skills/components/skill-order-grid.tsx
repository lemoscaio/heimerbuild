import type { AbilitySlot, ChampionSpell } from "@schemas/champion"
import { GameIcon } from "@/components/common/game-icon"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import { MAX_LEVEL } from "@/lib/stats/growth"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { SkillPoint } from "../lib/skill-history"
import { SkillGridCell } from "./skill-grid-cell"

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, index) => index + 1)

export type SkillOrderGridProps = {
	spells: readonly ChampionSpell[]
	points: readonly SkillPoint[]
	keptPicks: readonly AbilitySlot[]
	ranks: AbilityRanks
	canPlace: (pointLevel: number, slot: AbilitySlot) => boolean
	onPlace: (pointLevel: number, slot: AbilitySlot) => void
}

/** The game's skill order grid: a row per ability, a column per level (one toggle group each). */
export function SkillOrderGrid({
	spells,
	points,
	keptPicks,
	ranks,
	canPlace,
	onPlace,
}: SkillOrderGridProps) {
	const level = points.length

	return (
		<div className="scrollbar-purple flex gap-1 overflow-x-auto pb-2">
			<div className="flex w-32 shrink-0 flex-col gap-1">
				<span aria-hidden="true" className="h-5" />
				{spells.map((spell) => (
					<div key={spell.slot} className="flex h-9 items-center gap-2">
						<GameIcon
							src={spell.icon}
							name={spell.name}
							className="size-8 rounded-md"
						/>
						<div className="flex min-w-0 flex-col leading-tight">
							<span className="truncate font-bold text-xs">
								{spell.slot} · {spell.name}
							</span>
							<span className="text-[11px] text-subtle">
								Rank {ranks[spell.slot]}/{spell.maxRank}
							</span>
						</div>
					</div>
				))}
			</div>
			{LEVELS.map((columnLevel) => {
				const point = points[columnLevel - 1]
				const kept = keptPicks[columnLevel - level - 1]
				const cells = spells.map((spell) => (
					<SkillGridCell
						key={spell.slot}
						spell={spell}
						level={columnLevel}
						point={point}
						canPlace={!!point && canPlace(columnLevel, spell.slot)}
						isKept={kept === spell.slot}
					/>
				))
				return (
					<div
						key={columnLevel}
						className={cn("flex min-w-6 flex-1 flex-col gap-1", {
							"border-lilac border-r-2 pr-1": columnLevel === level,
						})}
					>
						<span
							className={cn(
								"h-5 text-center font-bold text-[11px] text-subtle tabular-nums",
								{ "text-white": columnLevel <= level },
							)}
						>
							<span className="sr-only">Level </span>
							{columnLevel}
						</span>
						{point ? (
							<ToggleGroup
								aria-label={`Level ${columnLevel} point`}
								orientation="vertical"
								className="flex-col items-stretch gap-1"
								value={[point.slot]}
								onValueChange={([next]) =>
									next && next !== point.slot && onPlace(columnLevel, next)
								}
							>
								{cells}
							</ToggleGroup>
						) : (
							cells
						)}
					</div>
				)
			})}
		</div>
	)
}
