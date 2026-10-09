// Vayne: Tumble is an empowered attack that resets the attack timer. Silver Bolts can't be cast:
// her attacks and Condemn add a stack, and the third deals its true damage and clears them. Condemn
// lands with or without a wall. Final Hour grants bonus AD and shortens Tumble's cooldown. Night
// Hunter, the invisibility, the minimum Silver Bolts damage (below 1000 maximum health) and crits
// are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

const SILVER_BOLTS = "vayne-w"

export const VAYNE_EFFECTS = [
	{
		// The hits within 3.5 s of each other; the third deals the true damage and they start over.
		id: SILVER_BOLTS,
		source: { kind: "ability", championKey: "Vayne", slot: "W" },
		trigger: { kind: "on-hit" },
		label: "Silver Bolts stacks",
		listed: false,
		stacks: { max: 3 },
		duration: 3.5,
		grants: [],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Vayne/Silver_Bolts`,
	},
	{
		id: "vayne-w-bolt",
		source: { kind: "ability", championKey: "Vayne", slot: "W" },
		trigger: { kind: "on-max-stacks", effect: SILVER_BOLTS },
		label: "third hit",
		resets: { effect: SILVER_BOLTS, stacks: 0 },
		grants: [{ kind: "abilityDamage", ability: "W", name: "TotalDamage" }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Vayne/Silver_Bolts`,
	},
	{
		id: "vayne-r",
		source: { kind: "ability", championKey: "Vayne", slot: "R" },
		trigger: { kind: "after-use" },
		duration: { by: "rankValue", label: "Duration" },
		grants: [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: { by: "rankValue", label: "Bonus AD" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Vayne/Final_Hour`,
	},
	{
		// On cast, like Final Hour's AD; the combo only reads it.
		id: "vayne-r-tumble",
		source: { kind: "ability", championKey: "Vayne", slot: "R" },
		trigger: { kind: "on-cast", slots: ["R"] },
		label: "Tumble cooldown reduced",
		listed: false,
		duration: { by: "rankValue", label: "Duration" },
		grants: [
			{
				kind: "cooldownMultiplier",
				slots: ["Q"],
				amount: percentLine("Tumble Cooldown Reduction"),
				reduction: true,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Vayne/Final_Hour`,
	},
] satisfies readonly Effect[]

export const VAYNE_HIT_RULES = [
	{
		// `ADRatioBonus` is the bonus only: 75 to 115% AD (+50% AP).
		championKey: "Vayne",
		slot: "Q",
		empowersAttack: { resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Vayne/Tumble`,
	},
	{
		championKey: "Vayne",
		slot: "W",
		noCast: "Silver Bolts has no active: Vayne's attacks and Condemn apply it",
		since: "16.19",
		sourceUrl: `${WIKI}Vayne/Silver_Bolts`,
	},
	{
		// A target knocked into terrain takes 150% more: `EmpoweredDamageTT` on top.
		championKey: "Vayne",
		slot: "E",
		variants: [
			{ id: "open", label: "No wall", damage: "TotalDamage" },
			{
				id: "wall",
				label: "Into a wall",
				damage: ["TotalDamage", "EmpoweredDamageTT"],
			},
		],
		triggers: SILVER_BOLTS,
		since: "16.19",
		sourceUrl: `${WIKI}Vayne/Condemn`,
	},
] satisfies readonly AbilityHitRule[]
