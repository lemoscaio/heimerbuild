import type { AbilityDamage, Champion } from "./schemas/champion"

/** How much of an ability's tooltip damage the sync read: `none` when its tooltip shows no damage. */
export type DamageCoverage = "modeled" | "partial" | "not-modeled" | "none"

export type AbilityCoverage = {
	/** "Passive", "Q", or a form's slot ("cannon Q"). */
	ability: string
	coverage: DamageCoverage
	/** Each damage the sync could not read, with why. */
	notModeled: { name: string; reasons: readonly string[] }[]
}

export type ChampionCoverage = {
	key: string
	name: string
	abilities: AbilityCoverage[]
	/** Every damage of every ability (passive and other forms included) has a formula. */
	full: boolean
}

export function abilityCoverage(
	damage: readonly AbilityDamage[] | undefined,
): DamageCoverage {
	if (!damage?.length) return "none"
	const modeled = damage.filter(({ notModeled }) => !notModeled).length
	if (modeled === damage.length) return "modeled"
	return modeled ? "partial" : "not-modeled"
}

function coverageOf(
	ability: string,
	damage: readonly AbilityDamage[] | undefined,
): AbilityCoverage {
	return {
		ability,
		coverage: abilityCoverage(damage),
		notModeled: (damage ?? []).flatMap(({ name, notModeled }) =>
			notModeled ? [{ name, reasons: notModeled }] : [],
		),
	}
}

/** Per champion and ability, how much damage the formulas cover. Pure. */
export function damageCoverage(
	champions: readonly Pick<Champion, "key" | "name" | "abilities">[],
): ChampionCoverage[] {
	return champions.map(({ key, name, abilities }) => {
		const forms = Object.entries(abilities.forms ?? {}).flatMap(
			([form, spells]) => [
				...(spells.passive?.damage
					? [coverageOf(`${form} passive`, spells.passive.damage)]
					: []),
				...(["Q", "W", "E", "R"] as const).flatMap((slot) => {
					const spell = spells[slot]
					return spell ? [coverageOf(`${form} ${slot}`, spell.damage)] : []
				}),
			],
		)
		const rows = [
			coverageOf("Passive", abilities.passive.damage),
			...abilities.spells.map((spell) => coverageOf(spell.slot, spell.damage)),
			...forms,
		]
		const withDamage = rows.filter(({ coverage }) => coverage !== "none")
		return {
			key,
			name,
			abilities: rows,
			full:
				withDamage.length > 0 &&
				withDamage.every(({ coverage }) => coverage === "modeled"),
		}
	})
}

const MARKS: Readonly<Record<DamageCoverage, string>> = {
	modeled: "yes",
	partial: "partial",
	"not-modeled": "no",
	none: "-",
}

/** The report the sync PR shows: totals, one row per champion, then every damage left unread and why. */
export function coverageMarkdown(
	coverage: readonly ChampionCoverage[],
): string {
	const abilities = coverage.flatMap((champion) => champion.abilities)
	const count = (kind: DamageCoverage) =>
		abilities.filter(({ coverage }) => coverage === kind).length
	const full = coverage.filter((champion) => champion.full)
	const rows = coverage.map(({ name, abilities: rowAbilities, full }) => {
		const cell = (ability: string) =>
			MARKS[
				rowAbilities.find((row) => row.ability === ability)?.coverage ?? "none"
			]
		const forms = rowAbilities
			.filter(({ ability }) => ability.includes(" "))
			.map(({ ability, coverage: kind }) => `${ability}: ${MARKS[kind]}`)
			.join(", ")
		return `| ${name} | ${full ? "yes" : "no"} | ${["Passive", "Q", "W", "E", "R"].map(cell).join(" | ")} | ${forms} |`
	})
	const unread = coverage.flatMap(({ name, abilities: rowAbilities }) =>
		rowAbilities.flatMap(({ ability, notModeled }) =>
			notModeled.map(
				(damage) =>
					`- ${name} ${ability} \`${damage.name}\`: ${damage.reasons.join("; ")}`,
			),
		),
	)
	return [
		"### Ability damage coverage",
		"",
		`${full.length} of ${coverage.length} champions have every damage formula read. Abilities with damage: ${count("modeled")} modeled, ${count("partial")} partial, ${count("not-modeled")} not modeled (${count("none")} show no damage).`,
		"",
		"A formula read in full is not yet checked: the combo's curated champions are also checked on the wiki.",
		"",
		"<details><summary>Per champion</summary>",
		"",
		"| Champion | Full | Passive | Q | W | E | R | Other forms |",
		"| --- | --- | --- | --- | --- | --- | --- | --- |",
		...rows,
		"",
		"</details>",
		"",
		"<details><summary>Not modeled, and why</summary>",
		"",
		...unread,
		"",
		"</details>",
		"",
	].join("\n")
}
