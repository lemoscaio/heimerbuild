import { GameIcon } from "@/components/common/game-icon"
import { ToggleGroup } from "@/components/ui/toggle-group"
import { MAX_LEVEL } from "@/lib/stats/growth"
import { SkillGridCell } from "./skill-grid-cell"
import type { SkillOrderGridProps } from "./skill-order-grid"

/** The skill order grid turned for phones: a row per level with four large buttons. */
export function SkillOrderList({
	spells,
	points,
	keptPicks,
	ranks,
	canPlace,
	onPlace,
}: SkillOrderGridProps) {
	const level = points.length
	const rows = Array.from(
		{ length: Math.min(MAX_LEVEL, level + keptPicks.length) },
		(_, index) => index + 1,
	)

	return (
		<div className="flex flex-col gap-1.5">
			<div className="grid grid-cols-[3rem_repeat(4,1fr)] gap-1.5">
				<span aria-hidden="true" />
				{spells.map((spell) => (
					<div key={spell.slot} className="flex flex-col items-center gap-0.5">
						<GameIcon
							src={spell.icon}
							name={spell.name}
							className="size-8 rounded-md"
						/>
						<span className="text-[11px] text-subtle">
							{ranks[spell.slot]}/{spell.maxRank}
						</span>
					</div>
				))}
			</div>
			{rows.map((rowLevel) => {
				const point = points[rowLevel - 1]
				const kept = keptPicks[rowLevel - level - 1]
				const cells = spells.map((spell) => (
					<SkillGridCell
						key={spell.slot}
						spell={spell}
						level={rowLevel}
						point={point}
						canPlace={!!point && canPlace(rowLevel, spell.slot)}
						isKept={kept === spell.slot}
						size="large"
					>
						{spell.slot}
					</SkillGridCell>
				))
				return (
					<div
						key={rowLevel}
						className="grid grid-cols-[3rem_1fr] items-center gap-1.5"
					>
						<span className="font-bold font-display text-sm">
							Lv {rowLevel}
						</span>
						{point ? (
							<ToggleGroup
								aria-label={`Level ${rowLevel} point`}
								className="grid grid-cols-4 gap-1.5"
								value={[point.slot]}
								onValueChange={([next]) =>
									next && next !== point.slot && onPlace(rowLevel, next)
								}
							>
								{cells}
							</ToggleGroup>
						) : (
							<div className="grid grid-cols-4 gap-1.5">{cells}</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
