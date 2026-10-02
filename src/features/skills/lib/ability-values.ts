import type { AbilityRankValue, ChampionSpell } from "@schemas/champion"

export type AbilityValue = Pick<AbilityRankValue, "label" | "unit"> & {
	/** Undefined while the ability has no rank. */
	value: number | undefined
}

/** The spell's rank-up tooltip lines at `rank` (0 means not learned yet). */
export function abilityValuesAt(
	spell: Pick<ChampionSpell, "rankValues">,
	rank: number,
): AbilityValue[] {
	return spell.rankValues.map(({ label, unit, values }) => ({
		label,
		...(unit ? { unit } : {}),
		value: rank > 0 ? values[rank - 1] : undefined,
	}))
}

export type AbilityValueChange = Pick<AbilityRankValue, "label" | "unit"> & {
	from: number | undefined
	to: number
}

/** What the next rank changes, as the game's rank-up tooltip shows it ("Damage 80 → 125"). */
export function rankUpChanges(
	spell: Pick<ChampionSpell, "rankValues">,
	rank: number,
): AbilityValueChange[] {
	const now = abilityValuesAt(spell, rank)
	return abilityValuesAt(spell, rank + 1).flatMap(
		({ label, unit, value }, index) =>
			value === undefined || value === now[index]?.value
				? []
				: [
						{
							label,
							...(unit ? { unit } : {}),
							from: now[index]?.value,
							to: value,
						},
					],
	)
}

const valueFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 })

/** "125", "2.25", "12%". */
export function formatAbilityValue(
	value: number,
	unit?: AbilityRankValue["unit"],
): string {
	return `${valueFormat.format(value)}${unit ?? ""}`
}

/**
 * The tooltip lines for the per-rank table, without the cooldown and cost lines the table
 * already shows from the spell's own cooldown and cost.
 */
export function rankTableLines(
	spell: Pick<ChampionSpell, "rankValues" | "cooldown" | "cost">,
): AbilityRankValue[] {
	const sameValues = (a: readonly number[], b: readonly number[] | undefined) =>
		!!b &&
		a.length === b.length &&
		a.every((value, index) => value === b[index])
	const costValues =
		spell.cost && "values" in spell.cost ? spell.cost.values : undefined
	return spell.rankValues.filter(
		({ values }) =>
			!sameValues(values, spell.cooldown) && !sameValues(values, costValues),
	)
}
