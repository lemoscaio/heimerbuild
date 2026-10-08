import type { Effect, MatchStackSource } from "../effect"
import { VERIFIED_ON } from "./verified-on"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/** Glory: 2 per champion kill, 1 per assist, up to 10, 5 lost on death (wiki). */
export const DARK_SEAL_GLORY = {
	id: "dark-seal-stacks",
	name: "Dark Seal Glory",
	sliderMax: 10,
	capped: true,
} as const satisfies MatchStackSource

/** Glory: 4 per champion kill, 2 per assist, up to 25, 10 lost on death; Dark Seal's carry over (wiki). */
export const MEJAI_GLORY = {
	id: "mejai-stacks",
	name: "Mejai's Glory",
	sliderMax: 25,
	capped: true,
} as const satisfies MatchStackSource

/** Colossal Consumption's permanent health, which the build sets as the health itself, uncapped (wiki). */
export const HEARTSTEEL_HEALTH = {
	id: "heartsteel-health",
	name: "Heartsteel bonus health",
	// The wiki gives no typical amount; each proc grows with the champion's maximum health.
	sliderMax: 1500,
} as const satisfies MatchStackSource

/**
 * Item effects. The spellblades, Torment and Carve are the combat simulator's (`listed: false` keeps
 * the spellblades off the stats panel); the match stacks are the panel's too. The ratios match
 * CommunityDragon's 16.19 item data (`SpellbladeMultiplier`, `SpellbladeADRatio`, `LichBaneAPValue`).
 * A spellblade is primed at an ability's cast and spent by the next on-hit, which deals its damage
 * and starts its cooldown (wiki "Spellblade"). Liandry's burn checked on the wiki on 2026-10-06,
 * Black Cleaver's Carve on 2026-10-07.
 */
export const ITEM_EFFECTS: readonly Effect[] = [
	{
		id: "sheen-spellblade",
		source: { kind: "item", itemId: "3057" },
		trigger: { kind: "after-ability" },
		listed: false,
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
		listed: false,
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
		listed: false,
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
	{
		// Carve: physical damage adds a stack for 6 s, refreshed, up to 5: 6% armor each, 30% at 5 (wiki).
		id: "black-cleaver-carve",
		source: { kind: "item", itemId: "3071" },
		trigger: { kind: "on-damage", damageType: "physical" },
		holder: "target",
		label: "Carve",
		duration: 6,
		stacks: { max: 5 },
		grants: [
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "percent",
				amount: 0.3,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Black_Cleaver`,
	},
	{
		// Wiki: "For every stack, gain 4 ability power, up to 40 at maximum stacks."
		id: "dark-seal-glory",
		source: { kind: "item", itemId: "1082" },
		trigger: { kind: "always" },
		label: "Glory",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: DARK_SEAL_GLORY, ratio: 4 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Dark_Seal`,
	},
	{
		// Wiki: "For every stack, gain 5 ability power, up to 125 at maximum stacks. If you have at
		// least 10 stacks, also gain 10% bonus movement speed."
		id: "mejai-glory",
		source: { kind: "item", itemId: "3041" },
		trigger: { kind: "always" },
		label: "Glory",
		grants: [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "matchStacks", source: MEJAI_GLORY, ratio: 5 },
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: 0.1,
				from: { source: MEJAI_GLORY, stacks: 10 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Mejai%27s_Soulstealer`,
	},
	{
		// Wiki: an attack "grant[s] you permanent bonus health equal to 10% of that amount".
		id: "heartsteel-colossal-consumption",
		source: { kind: "item", itemId: "3084" },
		trigger: { kind: "always" },
		label: "Colossal Consumption",
		grants: [
			{
				kind: "stat",
				stat: "health",
				amount: { by: "matchStacks", source: HEARTSTEEL_HEALTH },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Heartsteel`,
	},
]
