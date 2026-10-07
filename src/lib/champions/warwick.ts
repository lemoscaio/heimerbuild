// Warwick: Blood Hunt's cast hunts a champion for 8 s, granting both passive bonuses against it.
// The passive's own trigger (a target below 50% health) and the doubling below 25% are left out.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const WARWICK_EFFECTS = [
	{
		// Against the hunted target: attacks gain the attack speed, following its trail the movement speed.
		id: "warwick-w-active",
		source: { kind: "ability", championKey: "Warwick", slot: "W" },
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
		sourceUrl: `${WIKI}Warwick/Blood_Hunt`,
	},
] satisfies readonly Effect[]
