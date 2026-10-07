// Viego: Harrowed Path's attack speed holds the whole 8 s in the mist; attacking or casting
// pauses only its movement speed, for 1 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const VIEGO_EFFECTS = [
	{
		// No endsOn: the attack speed holds the whole 8 s in the mist (wiki, issue 329).
		id: "viego-e-active",
		source: { kind: "ability", championKey: "Viego", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 8,
		pauses: {
			on: ["attack", "cast"],
			grants: ["movementSpeedPercent"],
			seconds: 1,
		},
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				// 4% per 100 AP.
				amount: { by: "stat", stat: "abilityPower", ratio: 0.0004 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Viego/Harrowed_Path`,
	},
] satisfies readonly Effect[]
