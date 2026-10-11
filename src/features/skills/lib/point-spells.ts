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
}

/** The grid's name and the rank-up line of the stats Aphelios's points buy, as the wiki labels them. */
const STAT_POINT_LABELS: Partial<
	Record<RankStat["stat"], { name: string; line: string }>
> = {
	attackDamage: { name: "AD", line: "Bonus Attack Damage" },
	attackSpeedPercent: { name: "AS", line: "Bonus Attack Speed" },
	lethality: { name: "Lethality", line: "Lethality" },
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
	return slots.flatMap((slot) => {
		const spell = spells.find((candidate) => candidate.slot === slot)
		if (!spell) return []
		const rankStat = statPoints?.find((candidate) => candidate.slot === slot)
		if (!rankStat) return [{ ...spell, tag: slot }]
		const { label, icon } = statDisplay[rankStat.stat]
		const { name, line } = STAT_POINT_LABELS[rankStat.stat] ?? {
			name: label,
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
