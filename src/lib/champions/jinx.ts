// Jinx: Fishbones adds attack range, keeps only 90% of her bonus attack speed and its attacks deal
// 110% AD. Pow-Pow's Rev'd up stacks up to 3 times on hit, the first stack twice as strong. Switcheroo!
// is the form switch, not a cast in the combo. Zap!'s cast time shrinks with bonus attack speed.
// Flame Chompers! explode under the target once armed. Super Mega Death Rocket lands near or far.
// The splash, mana per rocket, Get Excited!, the stacks expiring one by one and crits are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const JINX_EFFECTS = [
	{
		// Fishbones keeps 90% of Jinx's bonus attack speed (wiki; not in the tooltip).
		id: "jinx-q-rockets",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "rockets",
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackRange",
				amount: { by: "rankValue", label: "Rocket Bonus Range" },
			},
			{ kind: "attackSpeedMultiplier", of: "bonus", amount: -0.1 },
			// "Basic attacks with Fishbones ... deal 110% AD modified physical damage" (combo only).
			{ kind: "attackMultiplier", amount: 1.1 },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// The tooltip line is the 3 stacks' bonus attack speed; each lasts 2.5 s, "all stacks beyond
		// the first one being 50% effective" (wiki): half at 1 stack, three quarters at 2.
		id: "jinx-q-revd-up",
		source: { kind: "ability", championKey: "Jinx", slot: "Q" },
		form: "minigun",
		label: "Rev'd up",
		trigger: { kind: "on-hit" },
		duration: 2.5,
		stacks: { max: 3, shares: [0.5, 0.75, 1] },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Minigun Total Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// Chompers land 0.4 s after the cast and arm 0.5 s later (`GrenadeArmTime`): a target on
		// them, or walking over, sets them off then.
		id: "jinx-e",
		source: { kind: "ability", championKey: "Jinx", slot: "E" },
		trigger: { kind: "after-use" },
		delay: { seconds: 0.9, label: "explodes" },
		holder: "target",
		grants: [{ kind: "abilityDamage", ability: "E", name: "TotalDamage" }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Jinx/Flame_Chompers!`,
	},
] satisfies readonly Effect[]

export const JINX_HIT_RULES = [
	{
		championKey: "Jinx",
		slot: "Q",
		noCast:
			"Switcheroo! swaps the weapon: pick Minigun or Rockets as the form instead",
		since: "16.19",
		sourceUrl: `${WIKI}Jinx/Switcheroo!`,
	},
	{
		// "Cast time: 0.6 to 0.4 (based on 0 to 250% bonus attack speed)".
		championKey: "Jinx",
		slot: "W",
		attackSpeedCastTime: { min: 0.4, fullAt: 2.5 },
		since: "16.19",
		sourceUrl: `${WIKI}Jinx/Zap!`,
	},
	{
		// The explosion is the `jinx-e` effect's, once the Chompers arm.
		championKey: "Jinx",
		slot: "E",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Jinx/Flame_Chompers!`,
	},
	{
		// 10% to 100% of its damage over the first 1500 units; the missing health part doesn't scale.
		championKey: "Jinx",
		slot: "R",
		variants: [
			{ id: "far", label: "Far", damage: ["DamageMax", "PercentDamage"] },
			{ id: "near", label: "Near", damage: ["DamageFloor", "PercentDamage"] },
		],
		since: "16.19",
		sourceUrl: `${WIKI}Jinx/Super_Mega_Death_Rocket!`,
	},
] satisfies readonly AbilityHitRule[]
