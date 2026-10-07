// Trundle: Frozen Domain's speeds hold while he stands in the ice, which lasts 8 s.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const TRUNDLE_EFFECTS = [
	{
		// As if he stays in the area; its 25% increased healing is not a stat.
		id: "trundle-w-active",
		source: { kind: "ability", championKey: "Trundle", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 8,
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
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Trundle/Frozen_Domain`,
	},
] satisfies readonly Effect[]
