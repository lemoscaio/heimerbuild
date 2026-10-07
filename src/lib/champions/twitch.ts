// Twitch: Deadly Venom stacks up to 6 times on attacks; each tick deals its damage once per stack.
// Ambush: camouflage 1 s after the cast; its attack speed lasts 6 s from when an attack or a cast
// breaks it, or it runs out. Its camouflage speed is left out.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const TWITCH_EFFECTS = [
	{
		// Each attack adds a stack (up to 6) and refreshes the 6 s; every second, the synced damage per stack.
		id: "twitch-deadly-venom",
		source: { kind: "ability", championKey: "Twitch", slot: "passive" },
		trigger: { kind: "on-hit" },
		holder: "target",
		duration: 6,
		stacks: { max: 6 },
		grants: [
			{
				kind: "damageOverTime",
				tick: {
					by: "abilityDamage",
					ability: "passive",
					name: "DamagePerSecond",
					scale: 1,
				},
				every: 1,
				firstTick: "delayed",
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Twitch/Deadly_Venom`,
	},
	{
		// An attack breaks the camouflage as its windup starts (wiki), so its own timer reads the speed.
		// Any cast breaks it here; in the game only Venom Cask and Contaminate do.
		id: "twitch-q-active",
		source: { kind: "ability", championKey: "Twitch", slot: "Q" },
		trigger: { kind: "after-use" },
		delay: { seconds: 1, label: "camouflaged" },
		startsAfter: {
			label: "camouflaged",
			ending: "camouflage breaks",
			duration: { by: "rankValue", label: "Camouflage Duration" },
			endsOn: ["attack", "cast"],
		},
		duration: 6,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Twitch/Ambush`,
	},
] satisfies readonly Effect[]
