// Gnar: Hop's attack speed and Hyper's movement speed hold only as Mini Gnar.
// Hyper procs after 3 hits; GNAR!'s rank raises its speed, even though Mini Gnar can't cast GNAR!.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const GNAR_EFFECTS = [
	{
		// No bonus when Hop transforms Gnar (wiki), so only as Mini Gnar.
		id: "gnar-e-active",
		source: { kind: "ability", championKey: "Gnar", slot: "E" },
		form: "mini",
		trigger: { kind: "after-use" },
		duration: 6,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Bonus Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Gnar/Hop`,
	},
	{
		// Its peak: the speed decays over 3 s. GNAR!'s passive raises it; 20% before R has a point (wiki).
		id: "gnar-w-hyper",
		source: { kind: "ability", championKey: "Gnar", slot: "W" },
		form: "mini",
		trigger: { kind: "on-hit" },
		stacks: { max: 3 },
		duration: 3,
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: {
					...percentLine("Hyper Move Speed"),
					slot: "R",
					unranked: 0.2,
				},
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Gnar/Hyper`,
	},
] satisfies readonly Effect[]
