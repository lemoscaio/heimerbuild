// Jinx: Switcheroo! (Q) swaps Pow-Pow for Fishbones once learned; the weapons' bonuses are app
// effects (src/lib/champions/jinx.ts). Each weapon shows its own icon, game text and rank-up line.
import type { FormAbilityRule } from "../form-abilities"
import { defineForms } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const JINX_FORMS = defineForms({
	id: "jinx-forms",
	championKey: "Jinx",
	since: "16.19",
	reason:
		"Switcheroo! (Q) swaps Pow-Pow for Fishbones once learned; the rockets' range and the minigun's Rev'd up are effects",
	source: `${WIKI_DATA}Jinx/Switcheroo!`,
	forms: [
		{ id: "minigun", name: "Minigun", gameName: "Pow-Pow" },
		{
			id: "rockets",
			name: "Rockets",
			gameName: "Fishbones",
			requires: { slot: "Q", minRank: 1 },
		},
	],
})

export const JINX_FORM_ABILITIES = {
	championKey: "Jinx",
	form: "rockets",
	since: "16.19",
	reason:
		"Switcheroo! keeps its rank and swaps the weapon: the HUD shows Pow-Pow or Fishbones (JinxQ's two icons) and the game describes each in its buff (JinxQIcon, JinxQ); each weapon keeps its own rank-up line",
	source: `${WIKI_DATA}Jinx/Switcheroo!`,
	spells: {
		Q: {
			spell: "JinxQ",
			icon: 0,
			lines: ["Rocket Bonus Range"],
			modeText: "game_buff_tooltip_JinxQ",
			default: {
				icon: 1,
				lines: ["Minigun Total Attack Speed"],
				modeText: "game_buff_tooltip_JinxQIcon",
			},
		},
	},
} satisfies FormAbilityRule
