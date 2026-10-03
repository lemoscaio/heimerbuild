import type { Effect } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/**
 * Item effects, as data for the combo timeline (stage 2): none is listed or applied yet. The ratios
 * match CommunityDragon's 16.19 item data (`SpellbladeMultiplier`, `SpellbladeADRatio`, `LichBaneAPValue`).
 */
export const ITEM_EFFECTS: readonly Effect[] = [
	{
		id: "sheen-spellblade",
		source: { kind: "item", itemId: "3057" },
		trigger: { kind: "after-ability" },
		duration: 10,
		cooldown: 1.5,
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 1 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Sheen`,
	},
	{
		id: "trinity-force-spellblade",
		source: { kind: "item", itemId: "3078" },
		trigger: { kind: "after-ability" },
		duration: 10,
		cooldown: 1.5,
		grants: [
			{
				kind: "damage",
				damageType: "physical",
				ratios: { baseAttackDamage: 2 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Trinity_Force`,
	},
	{
		id: "lich-bane-spellblade",
		source: { kind: "item", itemId: "3100" },
		trigger: { kind: "after-ability" },
		duration: 10,
		cooldown: 1.5,
		grants: [
			{
				kind: "damage",
				damageType: "magic",
				ratios: { baseAttackDamage: 0.75, abilityPower: 0.45 },
			},
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.5 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Lich_Bane`,
	},
]
