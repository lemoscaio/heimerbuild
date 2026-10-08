// Rengar: Data Dragon gives Savagery, Battle Roar and Bola Strike a 0.25 s cooldown at every rank,
// and the game files give Thrill of the Hunt a 0.25 s cast time. Bola Strike keeps its 0.25 s: the
// wiki's cast time when he isn't leaping.
import { defineAbilityFixes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const RENGAR_ABILITIES = defineAbilityFixes({
	id: "rengar-abilities",
	championKey: "Rengar",
	since: "16.19",
	reason:
		"Data Dragon gives Savagery, Battle Roar and Bola Strike 0.25 s at every rank (the wiki: 6 to 4 s, 16 to 10 s and 10 s); the game files give Thrill of the Hunt a 0.25 s cast time, the wiki none",
	source: `${WIKI_DATA}Rengar/Thrill_of_the_Hunt`,
	cooldowns: {
		Q: [6, 5.5, 5, 4.5, 4],
		W: [16, 14.5, 13, 11.5, 10],
		E: [10, 10, 10, 10, 10],
	},
	castTimes: { R: 0 },
})
