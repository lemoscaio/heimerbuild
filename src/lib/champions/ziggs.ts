// Ziggs: Short Fuse empowers an attack every 12 s, and each ability cast takes 4 to 6 s (by level) off.
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const ZIGGS_EFFECTS = [
	{
		// Every 12 s (from the attack that spends it) the next attack deals the synced bonus damage (wiki).
		id: "ziggs-short-fuse",
		source: { kind: "ability", championKey: "Ziggs", slot: "passive" },
		trigger: { kind: "periodic" },
		duration: Number.POSITIVE_INFINITY,
		endsOn: "on-hit",
		cooldown: 12,
		reducedOnCast: {
			by: "championLevel",
			steps: [
				{ from: 1, value: 4 },
				{ from: 7, value: 5 },
				{ from: 13, value: 6 },
			],
		},
		start: { kind: "running" },
		grants: [
			{ kind: "abilityDamage", ability: "passive", name: "TotalDamage" },
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Ziggs/Short_Fuse`,
	},
] satisfies readonly Effect[]
