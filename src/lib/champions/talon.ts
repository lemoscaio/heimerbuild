// Talon: Shadow Assault's movement speed holds while he is invisible, up to 2.5 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const TALON_EFFECTS = [
	{
		// Breaking stealth ends it: an attack, or a cast (Noxian Diplomacy, the recast).
		id: "talon-r-active",
		source: { kind: "ability", championKey: "Talon", slot: "R" },
		trigger: { kind: "after-use" },
		endsOn: ["attack", "cast"],
		duration: 2.5,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Talon/Shadow_Assault`,
	},
] satisfies readonly Effect[]
