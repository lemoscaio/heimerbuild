import type { Effect } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/**
 * Item effects, read only by the combat simulator: the stats panel lists none yet. The ratios match
 * CommunityDragon's 16.19 item data (`SpellbladeMultiplier`, `SpellbladeADRatio`, `LichBaneAPValue`).
 * A spellblade is primed at an ability's cast and spent by the next on-hit, which deals its damage
 * and starts its cooldown (wiki "Spellblade").
 */
export const ITEM_EFFECTS: readonly Effect[] = [
	{
		id: "sheen-spellblade",
		source: { kind: "item", itemId: "3057" },
		trigger: { kind: "after-ability" },
		duration: 10,
		cooldown: 1.5,
		endsOn: "on-hit",
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
		endsOn: "on-hit",
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
		endsOn: "on-hit",
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
