import type { AbilitySlot } from "@schemas/champion"
import { cn } from "@/lib/cn"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { PointSpell } from "../lib/point-spells"
import type { LevelPoint } from "../lib/skill-history"
import { PointIcon } from "./point-icon"
import { SkillGridCell } from "./skill-grid-cell"
import { SkillLevelCells } from "./skill-level-cells"

export type SkillOrderGridProps = {
	/** What the points go to: the abilities, or Aphelios's stats. */
	spells: readonly PointSpell[]
	levels: readonly LevelPoint[]
	/** The current champion level. */
	level: number
	ranks: AbilityRanks
	canPlace: (pointLevel: number, slot: AbilitySlot) => boolean
	onPlace: (pointLevel: number, slot: AbilitySlot) => void
	onRemove: (pointLevel: number) => void
}

/** The game's skill order grid: a row per ability (or stat), a column per level (one toggle group each). */
export function SkillOrderGrid({
	spells,
	levels,
	level,
	ranks,
	canPlace,
	onPlace,
	onRemove,
}: SkillOrderGridProps) {
	return (
		<div className="scrollbar-purple flex gap-1 overflow-x-auto pb-2">
			<div className="flex w-32 shrink-0 flex-col gap-1">
				<span aria-hidden="true" className="h-5" />
				{spells.map((spell) => (
					<div key={spell.slot} className="flex h-9 items-center gap-2">
						<PointIcon spell={spell} className="size-8 rounded-md" />
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
			{levels.map((point) => {
				const cells = spells.map((spell) => (
					<SkillGridCell
						key={spell.slot}
						spell={spell}
						point={point}
						canPlace={canPlace(point.level, spell.slot)}
					/>
				))
				return (
					<div
						key={point.level}
						className={cn("flex min-w-6 flex-1 flex-col gap-1", {
							"border-lilac border-r-2 pr-1": point.level === level,
						})}
					>
						<span
							className={cn(
								"h-5 text-center font-bold text-[11px] text-subtle tabular-nums",
								{ "text-white": point.level <= level },
							)}
						>
							<span className="sr-only">Level </span>
							{point.level}
						</span>
						<SkillLevelCells
							point={point}
							onPlace={(slot) => onPlace(point.level, slot)}
							onRemove={() => onRemove(point.level)}
							className="flex-col items-stretch gap-1"
							orientation="vertical"
						>
							{cells}
						</SkillLevelCells>
					</div>
				)
			})}
		</div>
	)
}
