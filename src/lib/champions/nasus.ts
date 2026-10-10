// Nasus: Siphoning Strike is an empowered attack that resets the attack timer, plus its stacks (the
// build's match stacks, `nasus-q-stacks`; none gained in a combo). Spirit Fire's fire burns and lowers armor while the target stays in it, and Fury of
// the Sands' aura burns for up to 15 s and halves Siphoning Strike's cooldown. The life steal, the
// slow and R's stats are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect, MatchStackSource } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

/** Siphoning Strike's permanent stacks: 4 per kill, 10 for a champion or a large unit (wiki), uncapped. */
export const SIPHONING_STRIKE_STACKS = {
	id: "siphoning-strike",
	name: "Siphoning Strike stacks",
	// The wiki gives no typical count; long games pass 1000.
	sliderMax: 1500,
} as const satisfies MatchStackSource

export const NASUS_EFFECTS = [
	{
		// The synced `TotalDamage` adds 100% of the stacks as its `stacks` counter part.
		id: "nasus-q-stacks",
		source: { kind: "ability", championKey: "Nasus", slot: "Q" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "counter",
				counter: "stacks",
				amount: { by: "matchStacks", source: SIPHONING_STRIKE_STACKS },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Nasus/Siphoning_Strike`,
	},
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
		// On cast, not after use: R's time in the aura doesn't shorten it.
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
		// `TotalDamage` is the attack plus the bonus and its stacks (`nasus-q-stacks`). Wiki: "The basic
		// attack is also [...] treated as both basic damage and spell damage."
		championKey: "Nasus",
		slot: "Q",
		empowersAttack: {
			includesAttack: true,
			resetsAttack: true,
			spellAttack: true,
		},
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Siphoning_Strike`,
	},
	{
		// The cast deals `InitialDamage`; the `nasus-e` effect burns while the target stays in the fire.
		championKey: "Nasus",
		slot: "E",
		timeInArea: {
			min: 1,
			max: 5,
			step: 1,
			label: { text: "In fire", name: "Time in the fire" },
		},
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Spirit_Fire`,
	},
	{
		// The aura is the `nasus-r` effect's damage over time, while the target stays near Nasus.
		championKey: "Nasus",
		slot: "R",
		damage: null,
		timeInArea: {
			min: 0.5,
			max: 15,
			step: 0.5,
			label: { text: "In aura", name: "Time in the aura" },
		},
		since: "16.19",
		sourceUrl: `${WIKI}Nasus/Fury_of_the_Sands`,
	},
] satisfies readonly AbilityHitRule[]
