// Wukong (MonkeyKing): Nimbus Strike's attack speed lasts 5 s after the dash. Crushing Blow is an
// empowered attack that resets the attack timer; its armor reduction is left out.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

export const MONKEY_KING_EFFECTS = [
	{
		id: "monkey-king-e-active",
		source: { kind: "ability", championKey: "MonkeyKing", slot: "E" },
		trigger: { kind: "after-use" },
		duration: 5,
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: percentLine("Attack Speed"),
			},
		],
		since: VERIFIED_ON,
		sourceUrl: `${WIKI}Wukong/Nimbus_Strike`,
	},
] satisfies readonly Effect[]

export const MONKEY_KING_HIT_RULES = [
	{
		// Wiki: the attack portion is "basic damage and spell damage", the bonus "proc damage"; the
		// bonus stays unmarked so the cast's one spell instance still reaches its effects.
		championKey: "MonkeyKing",
		slot: "Q",
		empowersAttack: { resetsAttack: true, spellAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Wukong/Crushing_Blow`,
	},
] satisfies readonly AbilityHitRule[]
