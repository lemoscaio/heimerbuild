// Rengar: Savagery's cast is its empowered attack, which resets the attack timer; its 40% attack
// speed holds for that attack and the next within 3 s; its Ferocity bonus is left out. Thrill of
// the Hunt ends on his next attack or a cast of W or E. The attack is the leap (Savagery's too):
// after its hit it deals R's bonus damage, then reduces the target's armor for 4 s.
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect, SlotCast } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

/** Wiki: "Attacking or casting abilities other than Savagery ends Thrill of the Hunt immediately." */
const CAST_BUT_SAVAGERY: SlotCast = { kind: "cast", slots: ["W", "E"] }

export const RENGAR_EFFECTS = [
	{
		// 40% from the wiki: no synced line. The empowered attack uses the first charge.
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
		// Savagery's empowered attack ends it as an attack.
		id: "rengar-r-active",
		source: { kind: "ability", championKey: "Rengar", slot: "R" },
		trigger: { kind: "after-use" },
		endsOn: ["attack", CAST_BUT_SAVAGERY],
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
		// The leap is his next attack: "deals 100% AD additional physical damage, then inflicts armor
		// reduction for 4 seconds" (wiki), "also tagged as proc damage"; 4 s has no synced line.
		id: "rengar-r-armor-reduction",
		source: { kind: "ability", championKey: "Rengar", slot: "R" },
		trigger: { kind: "after-use" },
		holder: "target",
		label: "leap",
		startsAfter: {
			label: "camouflaged",
			ending: "the leap",
			duration: { by: "rankValue", label: "Duration" },
			endsOn: ["attack"],
			dropsOn: [CAST_BUT_SAVAGERY],
			needsBreak: true,
		},
		duration: 4,
		grants: [
			{ kind: "abilityDamage", ability: "R", name: "BonusDamage", proc: true },
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

export const RENGAR_HIT_RULES = [
	{
		// `QTotalDamage` is the attack's damage plus the bonus (wiki: 20 to 160 + 5% AD), which "is
		// tagged as proc damage" (wiki notes, flagged as a bug).
		championKey: "Rengar",
		slot: "Q",
		empowersAttack: {
			includesAttack: true,
			resetsAttack: true,
			procBonus: true,
		},
		since: "16.19",
		sourceUrl: `${WIKI}Rengar/Savagery`,
	},
	{
		// The cast deals nothing: its `BonusDamage` lands with the leap (rengar-r-armor-reduction).
		championKey: "Rengar",
		slot: "R",
		damage: null,
		since: "16.19",
		sourceUrl: `${WIKI}Rengar/Thrill_of_the_Hunt`,
	},
] satisfies readonly AbilityHitRule[]
