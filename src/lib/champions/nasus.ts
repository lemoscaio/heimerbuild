// Nasus: Siphoning Strike is an empowered attack that resets the attack timer, plus its stacks (the
// Q variants). Spirit Fire's fire burns and lowers armor while the target stays in it, and Fury of
// the Sands' aura burns for up to 15 s and halves Siphoning Strike's cooldown. The life steal, the
// slow and R's stats are left out.
import type {
	AbilityHitRule,
	AbilityVariant,
} from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

/** A preset of Siphoning Strike stacks, which the build can't know. */
function stacks(count: number): AbilityVariant {
	return {
		id: String(count),
		label: String(count),
		counters: { stacks: count },
	}
}

/** A time the target stays in an area, as a preset. */
function seconds(time: number): AbilityVariant {
	return { id: `${time}s`, label: `${time} s`, duration: time }
}

export const NASUS_EFFECTS = [
	{
		// A tick every second for 5 s (wiki), the first 1 s in: `TotalDotDamage` is 5 ticks. The armor
		// reduction holds while in the fire; its 1 s linger after leaving is left out.
		id: "nasus-e",
		source: { kind: "ability", championKey: "Nasus", slot: "E" },
		trigger: { kind: "after-use" },
		holder: "target",
		duration: 5,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "E",
					name: "TotalDotDamage",
					scale: 1 / 5,
				},
				every: 1,
				firstTick: "delayed",
			},
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "percent",
				amount: percentLine("Armor Reduction %"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nasus/Spirit_Fire`,
	},
	{
		// "Magic damage every 0.5 seconds": `DamageCalc` is per second, so half of it per tick. The
		// 240 per second cap is left out (above 4800 maximum health at rank 3 without AP).
		id: "nasus-r",
		source: { kind: "ability", championKey: "Nasus", slot: "R" },
		trigger: { kind: "after-use" },
		holder: "target",
		duration: 15,
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "R",
					name: "DamageCalc",
					scale: 1 / 2,
				},
				every: 0.5,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nasus/Fury_of_the_Sands`,
	},
	{
		// On cast, not after use: the R variants' time in the aura doesn't shorten it.
		id: "nasus-r-siphoning-strike",
		source: { kind: "ability", championKey: "Nasus", slot: "R" },
		trigger: { kind: "on-cast", slots: ["R"] },
		label: "Siphoning Strike cooldown halved",
		listed: false,
		duration: 15,
		grants: [{ kind: "cooldownMultiplier", slots: ["Q"], amount: 0.5 }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nasus/Fury_of_the_Sands`,
	},
] satisfies readonly Effect[]

export const NASUS_HIT_RULES = [
	{
		// `TotalDamage` is the attack plus the bonus and its stacks, which a kill grows (4, or 10 for a
		// champion or a large unit; wiki): the player says how many.
		championKey: "Nasus",
		slot: "Q",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		variants: [stacks(0), stacks(100), stacks(250), stacks(500)],
		variantsLabel: { text: "Stacks", name: "Siphoning Strike stacks" },
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Siphoning_Strike`,
	},
	{
		// The cast deals `InitialDamage`; the `nasus-e` effect burns while the target stays in the fire.
		championKey: "Nasus",
		slot: "E",
		variants: [seconds(1), seconds(3), seconds(5)],
		variantsLabel: { text: "In fire", name: "Time in the fire" },
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Spirit_Fire`,
	},
	{
		// The aura is the `nasus-r` effect's damage over time, while the target stays near Nasus.
		championKey: "Nasus",
		slot: "R",
		damage: null,
		variants: [seconds(5), seconds(10), seconds(15)],
		variantsLabel: { text: "In aura", name: "Time in the aura" },
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Fury_of_the_Sands`,
	},
] satisfies readonly AbilityHitRule[]
