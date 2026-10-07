// Katarina: Preparation's movement speed decays until the dagger lands, 1.25 s later (its peak).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const KATARINA_EFFECTS = [
	{
		id: "katarina-w-active",
		source: { kind: "ability", championKey: "Katarina", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 1.25,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Katarina/Preparation`,
	},
] satisfies readonly Effect[]
