// Garen: Decisive Strike is an empowered attack that resets the attack timer. Judgment spins 7 times
// over 3 s (or the step's 1 to 3 s), plus one per 25% bonus attack speed, each dealing a lone
// target's 25% more, and no attack starts meanwhile; 6 hits lower its armor by 25% for 6 s. Demacian Justice deals its base plus a share of missing health. The
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
		// `TotalDamage` is the whole attack (wiki: 30 to 150 + 50% AD bonus). The wiki tags it "spell"
		// with an attack that crits apart from the bonus: a spell instance of its own, like Phase Dive.
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
		// "Judgment can be recast after 1 second while active"; "unable to declare basic attacks",
		// "Decisive Strike and Courage are usable", "Demacian Justice interrupts".
		timeInArea: {
			min: 1,
			max: 3,
			step: 0.25,
			label: { text: "Spinning", name: "Time spinning" },
			hitsName: "spins",
		},
		// The game's R ends the spin; the combo's R waits for the time the step chose (issue 444).
		blocksAttacks: { waitedForBy: ["R"] },
		// Wiki Conqueror: Judgment is "special cased to stack Conqueror for every tick of damage", each
		// spin a spell's 2 stacks (the Judgment page: "Each spin triggers a stack"). Electrocute: no.
		actionPerHit: ["conqueror"],
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
