import type { AbilitySlot, RankStat } from "./schemas/champion"

export type RankStatRule = {
	/** Data Dragon string id ("TwistedFate"). */
	championKey: string
	slot: AbilitySlot
	stat: RankStat["stat"]
	/** The spell value in the CommunityDragon character bin, by its `DataValues` name. */
	dataValue: string
	/** Turns the game value into the stat's unit: 0.01 makes 15 (percent) the fraction 0.15. */
	scale?: number
	/** What the rank grants, and any condition the stats panel assumes. */
	reason: string
	source: string
}

const WIKI = "https://wiki.leagueoflegends.com/en-us/Template:Data_"

/**
 * Stats an ability grants by its rank alone. The values come from the game files, so a patch
 * that changes a number updates the data; a renamed value fails the sync.
 */
export const RANK_STAT_RULES: readonly RankStatRule[] = [
	{
		championKey: "TwistedFate",
		slot: "E",
		stat: "attackSpeedPercent",
		dataValue: "AttackSpeedBonus",
		scale: 0.01,
		reason: "Stacked Deck passively grants bonus attack speed",
		source: `${WIKI}Twisted_Fate/Stacked_Deck`,
	},
	{
		championKey: "KogMaw",
		slot: "Q",
		stat: "attackSpeedPercent",
		dataValue: "AttackSpeed",
		reason: "Caustic Spittle passively grants bonus attack speed",
		source: `${WIKI}Kog%27Maw/Caustic_Spittle`,
	},
	{
		championKey: "JarvanIV",
		slot: "E",
		stat: "attackSpeedPercent",
		dataValue: "PermanentAttackSpeed",
		reason: "Demacian Standard passively grants bonus attack speed",
		source: `${WIKI}Jarvan_IV/Demacian_Standard`,
	},
	{
		championKey: "Nocturne",
		slot: "W",
		stat: "attackSpeedPercent",
		dataValue: "ActiveAS",
		scale: 0.01,
		reason:
			"Shroud of Darkness passively grants bonus attack speed (doubled for 5 s after blocking a spell, not applied)",
		source: `${WIKI}Nocturne/Shroud_of_Darkness`,
	},
	{
		championKey: "Olaf",
		slot: "R",
		stat: "armor",
		dataValue: "Resists",
		reason: "Ragnarok passively grants bonus armor while it is not active",
		source: `${WIKI}Olaf/Ragnarok`,
	},
	{
		championKey: "Olaf",
		slot: "R",
		stat: "magicResist",
		dataValue: "Resists",
		reason:
			"Ragnarok passively grants bonus magic resistance while it is not active",
		source: `${WIKI}Olaf/Ragnarok`,
	},
	{
		championKey: "Darius",
		slot: "E",
		stat: "armorPenetrationPercent",
		dataValue: "PassivePercentArmorPen",
		scale: 0.01,
		reason: "Apprehend passively grants armor penetration",
		source: `${WIKI}Darius/Apprehend`,
	},
	{
		championKey: "Pantheon",
		slot: "R",
		stat: "armorPenetrationPercent",
		dataValue: "ArmorPenetration",
		reason: "Grand Starfall passively grants armor penetration",
		source: `${WIKI}Pantheon/Grand_Starfall`,
	},
	{
		championKey: "Ambessa",
		slot: "R",
		stat: "armorPenetrationPercent",
		dataValue: "Armor_Penetration",
		reason: "Public Execution passively grants armor penetration",
		source: `${WIKI}Ambessa/Public_Execution`,
	},
	{
		championKey: "Zaahen",
		slot: "R",
		stat: "armorPenetrationPercent",
		dataValue: "ArmorPen",
		reason: "Grim Deliverance passively grants armor penetration",
		source: `${WIKI}Zaahen/Grim_Deliverance`,
	},
	{
		championKey: "Annie",
		slot: "R",
		stat: "magicPenetrationPercent",
		dataValue: "RPercentPenBuff",
		reason: "Summon: Tibbers passively grants magic penetration",
		source: `${WIKI}Annie/Summon:_Tibbers`,
	},
	{
		championKey: "Mordekaiser",
		slot: "E",
		stat: "magicPenetrationPercent",
		dataValue: "MagicPen",
		reason: "Death's Grasp passively grants magic penetration",
		source: `${WIKI}Mordekaiser/Death%27s_Grasp`,
	},
	{
		championKey: "Janna",
		slot: "W",
		stat: "movementSpeedPercent",
		dataValue: "MSPercent",
		reason:
			"Zephyr passively grants bonus movement speed (its +2% per 100 AP is a scaling, not applied)",
		source: `${WIKI}Janna/Zephyr`,
	},
	{
		championKey: "Teemo",
		slot: "W",
		stat: "movementSpeedPercent",
		dataValue: "PassiveMoveSpeedBonus",
		reason:
			"Move Quick passively grants bonus movement speed while Teemo was not hit by a champion or turret for 5 s; the app applies it as the teemo-w-passive effect, on by default",
		source: `${WIKI}Teemo/Move_Quick`,
	},
]

/** A rule's value per rank, from rank 1; fails when the game files lack it. */
export function rankStatValues(
	rule: RankStatRule,
	gameValues: readonly (number | null)[] | undefined,
	maxRank: number,
): number[] {
	const values = gameValues?.slice(1, maxRank + 1)
	if (
		!values ||
		values.length !== maxRank ||
		values.some((value) => value === null)
	) {
		throw new Error(
			`rank stat ${rule.slot} ${rule.stat}: no "${rule.dataValue}" value per rank`,
		)
	}
	const scale = rule.scale ?? 1
	return (values as number[]).map(
		(value) => Math.round(value * scale * 10_000) / 10_000,
	)
}
