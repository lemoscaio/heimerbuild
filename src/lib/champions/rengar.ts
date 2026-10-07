// Rengar: Savagery's cast is its empowered attack, which resets the attack timer; its 40% attack
// speed holds for that attack and the next within 3 s; its Ferocity bonus is left out. Thrill of
// the Hunt's movement speed ends on his next attack or cast; that attack or cast is the leap, which
// reduces the target's armor for 4 s after its hit (none without a leap).
import type { AbilityHitRule } from "../combat/registries/ability-hits"
import type { Effect } from "../effects/effect"
import { VERIFIED_ON } from "../effects/registries/verified-on"
import { percentLine, WIKI } from "./rule-helpers"

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
		// Attacking or casting anything but Savagery ends it (wiki): Savagery's empowered attack does.
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

export const RENGAR_HIT_RULES = [
	{
		// `QTotalDamage` is the attack's damage plus the bonus (wiki: 20 to 160 + 5% AD).
		championKey: "Rengar",
		slot: "Q",
		empowersAttack: { includesAttack: true, resetsAttack: true },
		since: "16.19",
		sourceUrl: `${WIKI}Rengar/Savagery`,
	},
] satisfies readonly AbilityHitRule[]
