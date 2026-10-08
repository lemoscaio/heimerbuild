// Rengar: Data Dragon gives Savagery, Battle Roar and Bola Strike a 0.25 s cooldown at every rank.
import { defineCooldowns } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const RENGAR_COOLDOWNS = defineCooldowns({
	id: "rengar-cooldowns",
	championKey: "Rengar",
	since: "16.19",
	reason:
		"Data Dragon gives Savagery, Battle Roar and Bola Strike 0.25 s at every rank; the wiki gives 6 to 4 s, 16 to 10 s and 10 s",
	source: `${WIKI_DATA}Rengar/Savagery`,
	cooldowns: {
		Q: [6, 5.5, 5, 4.5, 4],
		W: [16, 14.5, 13, 11.5, 10],
		E: [10, 10, 10, 10, 10],
	},
})
