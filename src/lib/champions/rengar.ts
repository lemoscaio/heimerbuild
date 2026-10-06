// Rengar: Thrill of the Hunt's movement speed ends on his next attack or cast.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const RENGAR_EFFECTS = [
	{
		// Attacking or casting anything but Savagery ends it (wiki); the combo's Savagery cast is
		// its empowered attack, which ends it too.
		id: "rengar-r-active",
		source: { kind: "ability", championKey: "Rengar", slot: "R" },
		trigger: { kind: "after-use" },
		endsOn: ["attack", "cast"],
		duration: { by: "rankValue", label: "Duration" },
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: percentLine("Move Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Rengar/Thrill_of_the_Hunt`,
	},
] satisfies readonly Effect[]
