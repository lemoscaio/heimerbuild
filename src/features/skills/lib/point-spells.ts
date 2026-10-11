import type { AbilitySlot, ChampionSpell, RankStat } from "@schemas/champion"
import { STAT_UNITS } from "@schemas/item"
import { statDisplay } from "@/lib/stat-display"

/** What a skill point can go to, as the skills row, grid and order show it. */
export type PointSpell = Pick<
	ChampionSpell,
	"slot" | "name" | "icon" | "maxRank" | "rankValues" | "unavailable"
> & {
	/** Its short name on the phone grid: the slot letter, or the stat ("AD"). */
	tag: string
	/** The stat a point buys and its tile's label, when the points raise stats (Aphelios). */
	statTile?: { stat: RankStat["stat"]; label: string }
}

/** The grid's name, the tile's label and the rank-up line (the wiki's) of the stats Aphelios's points buy. */
const STAT_POINT_LABELS: Partial<
	Record<RankStat["stat"], { name: string; tile: string; line: string }>
> = {
	attackDamage: { name: "AD", tile: "AD", line: "Bonus Attack Damage" },
	attackSpeedPercent: { name: "AS", tile: "AS", line: "Bonus Attack Speed" },
	lethality: { name: "Lethality", tile: "LETH", line: "Lethality" },
}

type PointSpellsOptions = {
	/** The slots that take points, in order. */
	slots: readonly AbilitySlot[]
	/** The stats the points buy, by slot, when they raise stats instead of abilities (Aphelios). */
	statPoints?: readonly RankStat[]
}

/**
 * The abilities the points go to; for a champion whose points raise stats (Aphelios), each slot
 * becomes its stat, named after it, with the stat per rank as its rank-up line.
 */
export function pointSpells(
	spells: readonly ChampionSpell[],
	{ slots, statPoints }: PointSpellsOptions,
): PointSpell[] {
	return slots.flatMap((slot): PointSpell[] => {
		const spell = spells.find((candidate) => candidate.slot === slot)
		if (!spell) return []
		const rankStat = statPoints?.find((candidate) => candidate.slot === slot)
		if (!rankStat) return [{ ...spell, tag: slot }]
		const { label, icon } = statDisplay[rankStat.stat]
		const { name, tile, line } = STAT_POINT_LABELS[rankStat.stat] ?? {
			name: label,
			tile: label,
			line: label,
		}
		const isPercent = STAT_UNITS[rankStat.stat] === "percent"
		return [
			{
				slot,
				name,
				icon,
				maxRank: spell.maxRank,
				tag: name,
				statTile: { stat: rankStat.stat, label: tile },
				rankValues: [
					{
						label: line,
						values: rankStat.values.map((value) =>
							isPercent ? Math.round(value * 10_000) / 100 : value,
						),
						...(isPercent && { unit: "%" as const }),
					},
				],
			},
		]
	})
}
