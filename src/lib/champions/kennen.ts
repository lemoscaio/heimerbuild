// Kennen: Lightning Rush's attack speed lasts 4 s once the rush ends (recast, or after 2 s).
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const KENNEN_EFFECTS = [
	{
		// From the cast, not from the rush's end. Exceeding the attack speed cap is left out.
		id: "kennen-e-active",
		source: { kind: "ability", championKey: "Kennen", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Kennen/Lightning_Rush`,
	},
] satisfies readonly Effect[]
