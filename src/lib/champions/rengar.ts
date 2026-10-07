// Rengar: Thrill of the Hunt's movement speed ends on his next attack or cast; that attack or cast
// is the leap, which reduces the target's armor for 4 s after its hit (none without a leap).
// Savagery's 40% attack speed holds for his next two attacks within 3 s; its Ferocity bonus is left out.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const RENGAR_EFFECTS = [
	{
		// 40% from the wiki: no synced line. In the combo, Savagery's cast is its empowered attack.
		id: "rengar-q-active",
		source: { kind: "ability", championKey: "Rengar", slot: "Q" },
		trigger: { kind: "after-use" },
		duration: 3,
		charges: 2,
		grants: [{ kind: "stat", stat: "attackSpeedPercent", amount: 0.4 }],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Rengar/Savagery`,
	},
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
	{
		// The camouflage breaks as Thrill of the Hunt ends; 4 s from the wiki, no synced line.
		id: "rengar-r-armor-reduction",
		source: { kind: "ability", championKey: "Rengar", slot: "R" },
		trigger: { kind: "after-use" },
		holder: "target",
		label: "armor reduction",
		startsAfter: {
			label: "camouflaged",
			ending: "the leap",
			duration: { by: "rankValue", label: "Duration" },
			endsOn: ["attack", "cast"],
			needsBreak: true,
		},
		duration: 4,
		grants: [
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "flat",
				amount: { by: "rankValue", label: "Armor Reduction" },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Rengar/Thrill_of_the_Hunt`,
	},
] satisfies readonly Effect[]
