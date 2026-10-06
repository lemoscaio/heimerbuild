import type { AbilitySlot } from "@schemas/champion"
import type { PatchRange } from "@schemas/patch-range"

const WIKI = "https://wiki.leagueoflegends.com/en-us/Template:Data_"

/**
 * How an ability's cast hits when its tooltip's first damage is not the whole story. Without a
 * rule, a cast deals the first damage of its tooltip (`damage`, synced).
 */
export type AbilityHitRule = PatchRange & {
	championKey: string
	slot: AbilitySlot
	/**
	 * The tooltip damage the cast deals, by name, or several dealt together (a base plus a share of
	 * the target's health); `null` deals none (an effect deals it, or nothing does in v1).
	 */
	damage?: string | readonly string[] | null
	/** The hit applies on-hit effects like a basic attack: it spends a spellblade, detonates a mark. */
	onHit?: true
	/** The cast's damage is known not to be simulated, and why; the hit shows that instead of a number. */
	notModeled?: string
	sourceUrl: string
}

/** Checked on patch 16.19 for the curated champions (`CURATED_COMBAT_CHAMPIONS`). */
export const ABILITY_HIT_RULES: readonly AbilityHitRule[] = [
	{
		championKey: "Ezreal",
		slot: "Q",
		onHit: true,
		since: "16.19",
		sourceUrl: `${WIKI}Ezreal/Mystic_Shot`,
	},
	{
		// The orb only marks; the detonation is the `ezreal-w-detonation` effect.
		championKey: "Ezreal",
		slot: "W",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Ezreal/Essence_Flux`,
	},
	{
		championKey: "Quinn",
		slot: "R",
		notModeled:
			"Skystrike, the recast after the 2 s channel, is not simulated yet",
		since: "16.19",
		sourceUrl: `${WIKI}Quinn/Behind_Enemy_Lines`,
	},
	{
		// Molten Shield's damage hits enemies that attack Annie; the target doesn't attack yet.
		championKey: "Annie",
		slot: "E",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Annie/Molten_Shield`,
	},
	{
		championKey: "Veigar",
		slot: "R",
		notModeled:
			"Primordial Burst grows with the target's missing health, which the formulas don't read yet",
		since: "16.19",
		sourceUrl: `${WIKI}Veigar/Primordial_Burst`,
	},
	{
		championKey: "Maokai",
		slot: "Q",
		damage: ["TotalDamage", "BasePercentHealth"],
		since: "16.19",
		sourceUrl: `${WIKI}Maokai/Bramble_Smash`,
	},
	{
		championKey: "Zac",
		slot: "W",
		damage: ["BaseDamage", "DisplayPercentDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Zac/Unstable_Matter`,
	},
	{
		championKey: "Singed",
		slot: "Q",
		notModeled:
			"Poison Trail deals its damage over time, which the combo doesn't simulate yet",
		since: "16.19",
		sourceUrl: `${WIKI}Singed/Poison_Trail`,
	},
	{
		championKey: "Singed",
		slot: "E",
		damage: ["BaseDamage", "MaxHPDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Singed/Fling`,
	},
	{
		// Zephyr adds Tailwind's 30% of bonus movement speed to its damage.
		championKey: "Janna",
		slot: "W",
		damage: ["TotalDamage", "spell.TailwindSelf:BonusDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Janna/Zephyr`,
	},
	{
		championKey: "Nautilus",
		slot: "W",
		notModeled:
			"Titan's Wrath deals its damage through the next basic attacks, which the combo doesn't simulate yet",
		since: "16.19",
		sourceUrl: `${WIKI}Nautilus/Titan's_Wrath`,
	},
	{
		championKey: "Morgana",
		slot: "W",
		notModeled:
			"Tormented Shadow deals its damage over 5 s, which the combo doesn't simulate yet",
		since: "16.19",
		sourceUrl: `${WIKI}Morgana/Tormented_Shadow`,
	},
]
