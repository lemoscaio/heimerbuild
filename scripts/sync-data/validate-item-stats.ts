import type { ItemStats, StatKey } from "./schemas/item"

/** Data Dragon `<stats>` label -> canonical stat, by whether the value ends in `%`. */
const STAT_LABELS: Record<string, { flat?: StatKey; percent?: StatKey }> = {
	"Attack Damage": { flat: "attackDamage" },
	"Ability Power": { flat: "abilityPower" },
	Health: { flat: "health" },
	Mana: { flat: "mana" },
	Armor: { flat: "armor" },
	"Magic Resist": { flat: "magicResist" },
	"Ability Haste": { flat: "abilityHaste" },
	Lethality: { flat: "lethality" },
	"Attack Range": { flat: "attackRange" },
	"Health Regen": { flat: "healthRegen" },
	"Mana Regen": { flat: "manaRegen" },
	"Attack Speed": { percent: "attackSpeedPercent" },
	"Critical Strike Chance": { percent: "critChancePercent" },
	"Critical Strike Damage": { percent: "critDamagePercent" },
	"Armor Penetration": {
		flat: "armorPenetrationFlat",
		percent: "armorPenetrationPercent",
	},
	"Magic Penetration": {
		flat: "magicPenetrationFlat",
		percent: "magicPenetrationPercent",
	},
	"Move Speed": { flat: "movementSpeedFlat", percent: "movementSpeedPercent" },
	"Life Steal": { percent: "lifeStealPercent" },
	Omnivamp: { percent: "omnivampPercent" },
	Tenacity: { percent: "tenacityPercent" },
	"Slow Resist": { percent: "slowResistPercent" },
	"Heal and Shield Power": { percent: "healAndShieldPowerPercent" },
	"Base Health Regen": { percent: "baseHealthRegenPercent" },
	"Base Mana Regen": { percent: "baseManaRegenPercent" },
}

/** Labels the game shows in `<stats>` that the item schema deliberately does not model. */
const UNMODELED_LABELS: ReadonlySet<string> = new Set([
	// Support-quest gold income; not a champion stat, so the calculator ignores it.
	"Gold Per 10 Seconds",
])

export type AllowlistEntry = {
	itemId: string
	/** Omitted: every stat of the item (only for items Data Dragon ships without a description). */
	stat?: StatKey
	/** Required: why the normalized value may differ from the `<stats>` block. */
	reason: string
}

/** Known, intentional differences between the normalized stats and the `<stats>` block. */
export const ITEM_STAT_ALLOWLIST: readonly AllowlistEntry[] = [
	{
		itemId: "1054",
		stat: "healthRegen",
		reason:
			"Doran's Shield shows its 4 Health per 5s in the Enduring Focus passive text, not in <stats>.",
	},
	{
		itemId: "3009",
		stat: "slowResistPercent",
		reason:
			"Boots of Swiftness shows its 25% slow resist in the Fleetfooted passive text, not in <stats>.",
	},
	{
		itemId: "3170",
		stat: "slowResistPercent",
		reason:
			"Swiftmarch shows its 25% slow resist in the Fleetfooted passive text, not in <stats>.",
	},
	{
		itemId: "3742",
		stat: "slowResistPercent",
		reason:
			"Dead Man's Plate shows its 15% slow resist in the Unsinkable passive text, not in <stats>.",
	},
	{
		itemId: "3865",
		reason:
			"Data Dragon ships World Atlas with an empty description, so there is no <stats> block to check.",
	},
]

export type StatMismatch = {
	itemId: string
	name: string
	stat: string
	expected: number | undefined
	actual: number | undefined
}

export type ItemToValidate = {
	id: string
	name: string
	description: string
	stats: ItemStats
}

const TOLERANCE = 1e-6

/**
 * Reads the `<stats>` block of a Data Dragon item description. Percent values become
 * fractions (`30%` -> 0.3), matching the item schema. Throws on a label it cannot map.
 */
export function parseStatsBlock(description: string): ItemStats {
	const block = description.match(/<stats>([\s\S]*?)<\/stats>/)?.[1] ?? ""
	const stats: ItemStats = {}
	for (const line of block.split(/<br\s*\/?>/)) {
		const text = line
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim()
		if (!text) continue
		const match = text.match(/^([+-]?\d+(?:\.\d+)?)(%?) (.+)$/)
		if (!match) throw new Error(`unreadable <stats> line "${text}"`)
		const [, value = "", percent, label = ""] = match
		if (UNMODELED_LABELS.has(label)) continue
		const stat = percent
			? STAT_LABELS[label]?.percent
			: STAT_LABELS[label]?.flat
		if (!stat) {
			throw new Error(
				`unknown <stats> label "${percent ? "% " : ""}${label}" (add it to STAT_LABELS in scripts/sync-data/validate-item-stats.ts)`,
			)
		}
		const amount = percent ? Number(value) / 100 : Number(value)
		stats[stat] = (stats[stat] ?? 0) + amount
	}
	return stats
}

function allowlistKey(itemId: string, stat = "*"): string {
	return `${itemId}:${stat}`
}

/**
 * Compares normalized stats with the `<stats>` block of every item.
 * `stale` lists allowlist entries that no longer match any difference.
 */
export function validateItemStats(
	items: readonly ItemToValidate[],
	allowlist: readonly AllowlistEntry[] = ITEM_STAT_ALLOWLIST,
): { mismatches: StatMismatch[]; stale: AllowlistEntry[] } {
	const allowed = new Map(
		allowlist.map((entry) => [allowlistKey(entry.itemId, entry.stat), entry]),
	)
	const used = new Set<string>()
	const mismatches: StatMismatch[] = []

	for (const item of items) {
		let expected: ItemStats
		try {
			expected = parseStatsBlock(item.description)
		} catch (error) {
			throw new Error(
				`Item ${item.id} (${item.name}): ${(error as Error).message}`,
			)
		}
		const stats = new Set([
			...Object.keys(expected),
			...Object.keys(item.stats),
		]) as Set<StatKey>
		for (const stat of stats) {
			const want = expected[stat]
			const got = item.stats[stat]
			// Normalized stats omit zeros; <stats> can show them (Yun Tal "0% Critical Strike Chance").
			if (Math.abs((want ?? 0) - (got ?? 0)) < TOLERANCE) continue
			const key = [allowlistKey(item.id, stat), allowlistKey(item.id)].find(
				(candidate) => allowed.has(candidate),
			)
			if (key) {
				used.add(key)
				continue
			}
			mismatches.push({
				itemId: item.id,
				name: item.name,
				stat,
				expected: want,
				actual: got,
			})
		}
	}

	const stale = [...allowed]
		.filter(([key]) => !used.has(key))
		.map(([, entry]) => entry)
	return { mismatches, stale }
}

function show(value: number | undefined): string {
	return value === undefined ? "(missing)" : String(value)
}

export function formatMismatches(mismatches: readonly StatMismatch[]): string {
	const rows = mismatches.map(
		(m) =>
			`  ${m.itemId} ${m.name}: ${m.stat} expected ${show(m.expected)}, actual ${show(m.actual)}`,
	)
	return [
		"Item stats differ from the Data Dragon <stats> block:",
		...rows,
		"Fix the mapping in scripts/sync-data/stat-map.ts, or add an ITEM_STAT_ALLOWLIST entry with a reason (scripts/sync-data/validate-item-stats.ts).",
	].join("\n")
}
