// Twitch: Deadly Venom stacks up to 6 times on attacks; each tick deals its damage once per stack.
// Ambush's attack speed lasts 6 s once he leaves camouflage; its camouflage speed is left out.
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
		// From the cast: an attack breaks the camouflage, so the combo's first attack is close to its start.
		id: "twitch-q-active",
		source: { kind: "ability", championKey: "Twitch", slot: "Q" },
		trigger: { kind: "after-use" },
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
