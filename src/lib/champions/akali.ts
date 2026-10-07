// Akali: Twilight Shroud's movement speed decays over 2 s (its peak); the shroud's energy is not a stat.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const AKALI_EFFECTS = [
	{
		id: "akali-w-active",
		source: { kind: "ability", championKey: "Akali", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 2,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Akali/Twilight_Shroud`,
	},
] satisfies readonly Effect[]
