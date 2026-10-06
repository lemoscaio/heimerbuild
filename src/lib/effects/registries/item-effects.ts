import type { Effect } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/**
 * Item effects, read only by the combat simulator: the stats panel lists none yet. The ratios match
 * CommunityDragon's 16.19 item data (`SpellbladeMultiplier`, `SpellbladeADRatio`, `LichBaneAPValue`).
 * A spellblade is primed at an ability's cast and spent by the next on-hit, which deals its damage
 * and starts its cooldown (wiki "Spellblade"). Liandry's burn checked on the wiki on 2026-10-06.
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
	{
		// Torment: ability damage burns for 1% of the target's maximum health every 0.5 s for 3 s (wiki).
		// To verify: the first tick's time (0.5 s after) is not on the wiki page in `sourceUrl`.
		id: "liandrys-torment-burn",
		source: { kind: "item", itemId: "6653" },
		trigger: { kind: "on-ability-damage" },
		holder: "target",
		duration: 3,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "targetHealth",
					damageType: "magic",
					health: "maximum",
					ratio: 0.01,
				},
				every: 0.5,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Liandry%27s_Torment`,
	},
]
