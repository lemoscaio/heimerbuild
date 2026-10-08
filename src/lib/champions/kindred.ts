// Kindred: Mark of the Kindred's marks (the build's match stacks) give attack range in steps, 75 at
// 4 marks up to 250 at 25, and Dance of Arrows 5% more attack speed each. The marks' Wolf's Frenzy
// and Mounting Dread damage is left out: the combo doesn't deal those parts.
import type { Effect, MatchStackSource, StackStep } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

/** One per takedown on a hunted champion or monster (wiki), uncapped. */
export const KINDRED_MARKS = {
	id: "kindred-marks",
	name: "Marks of the Kindred",
	// The range stops growing at 25 marks; few games pass 30.
	sliderMax: 30,
} as const satisfies MatchStackSource

/** "+75 at 4 stacks, and +25 every 3 stacks thereafter, up to 250 bonus range at 25 stacks." */
const RANGE_STEPS: readonly StackStep[] = [4, 7, 10, 13, 16, 19, 22, 25].map(
	(from, index) => ({ from, value: 75 + 25 * index }),
)

export const KINDRED_EFFECTS = [
	{
		id: "kindred-passive",
		source: { kind: "ability", championKey: "Kindred", slot: "passive" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "attackRange",
				amount: {
					by: "matchStacks",
					source: KINDRED_MARKS,
					steps: RANGE_STEPS,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Kindred/Mark_of_the_Kindred`,
	},
	{
		// Wiki: "gaining 35% (+ 5% per mark) bonus attack speed for 4 seconds".
		id: "kindred-q",
		source: { kind: "ability", championKey: "Kindred", slot: "Q" },
		trigger: { kind: "after-use" },
		duration: 4,
		grants: [
			{ kind: "stat", stat: "attackSpeedPercent", amount: 0.35 },
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: { by: "matchStacks", source: KINDRED_MARKS, ratio: 0.05 },
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Kindred/Dance_of_Arrows`,
	},
] satisfies readonly Effect[]
