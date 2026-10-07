// Katarina: Preparation's movement speed decays to nothing until the dagger lands, 1.25 s later.
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
				decay: {},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Katarina/Preparation`,
	},
] satisfies readonly Effect[]
