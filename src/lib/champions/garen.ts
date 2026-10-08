// Garen: Decisive Strike is an empowered attack that resets the attack timer. Judgment spins 7 times
// over 3 s, plus one per 25% bonus attack speed, each dealing a lone target's 25% more; 6 hits lower
// its armor by 25% for 6 s. Demacian Justice deals its base plus a share of missing health. The
// movement speed, silence, Courage and Perseverance are left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { WIKI } from "./rule-helpers"

export const GAREN_EFFECTS = [
	{
		// "Enemy champions hit 6 times by Judgment are inflicted with 25% armor reduction for 6
		// seconds"; 25% has no synced line. Each spin refreshes it, the wiki's 7th hit too.
		id: "garen-e-armor-reduction",
		source: { kind: "ability", championKey: "Garen", slot: "E" },
		trigger: { kind: "on-cast", slots: ["E"], perHit: true },
		holder: "target",
		label: "armor reduction",
		stacks: { max: 6, onlyAtMax: true },
		duration: 6,
		grants: [
			{
				kind: "resistReduction",
				resist: "armor",
				mode: "percent",
				amount: 0.25,
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Garen/Judgment`,
	},
] satisfies readonly Effect[]

export const GAREN_HIT_RULES = [
	{
		// `TotalDamage` is the whole attack (wiki: 30 to 150 + 50% AD bonus).
		championKey: "Garen",
		slot: "Q",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Garen/Decisive_Strike`,
	},
	{
		// A lone target is the nearest enemy: each spin deals `NearestEnemyBonus` (the sync's 125%).
		championKey: "Garen",
		slot: "E",
		damage: "NearestEnemyBonus",
		attackSpeedHits: { base: 7, perBonusAttackSpeed: 0.25, over: 3 },
		since: "16.19",
		sourceUrl: `${WIKI}Garen/Judgment`,
	},
	{
		championKey: "Garen",
		slot: "R",
		damage: ["BaseDamage", "ExecuteDamage"],
		since: "16.19",
		sourceUrl: `${WIKI}Garen/Demacian_Justice`,
	},
] satisfies readonly AbilityHitRule[]
