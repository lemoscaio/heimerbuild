// Nasus: Siphoning Strike (Q) is instant and Fury of the Sands (R) takes 0.2 s; the game files
// give 0.52 s and 0.25 s. Siphoning Strike's damage adds its stacks, a buff counter the sync can't
// read: it becomes a `stacks` counter, which the combo's Q variants give.

import { defineAbilityFixes } from "../overrides/define-champion-overrides"
import type { AbilityDamage } from "../schemas/champion"
import { WIKI_DATA } from "./rule-helpers"

/** The reason `damage-formulas.ts` gives a buff counter it can't read. */
const BUFF_COUNTER = "a buff counter"

function withStacks(damage: AbilityDamage[]): AbilityDamage[] {
	return damage.map((formula) => {
		const { notModeled, ...read } = formula
		if (read.name !== "TotalDamage" || !notModeled?.includes(BUFF_COUNTER)) {
			return formula
		}
		const others = notModeled.filter((reason) => reason !== BUFF_COUNTER)
		return {
			...read,
			// Wiki: "(+ 100% of Siphoning Strike stacks)".
			parts: [...read.parts, { counter: "stacks", ratio: 1 }],
			...(others.length && { notModeled: others }),
		}
	})
}

export const NASUS_ABILITIES = defineAbilityFixes({
	id: "nasus-abilities",
	championKey: "Nasus",
	since: "16.19",
	reason:
		"Siphoning Strike has no cast time and Fury of the Sands 0.2 s (the game files give 0.52 s and 0.25 s); Siphoning Strike adds 100% of its stacks, a buff counter the sync can't read",
	source: `${WIKI_DATA}Nasus/Siphoning_Strike`,
	castTimes: { Q: 0, R: 0.2 },
	damage: { Q: withStacks },
})
