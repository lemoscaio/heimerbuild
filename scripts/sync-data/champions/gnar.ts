// Gnar: Riot's data calls him melee; Mini Gnar, his starting form, is ranged (400 to 500 range by level).
// Mega Gnar is melee with his own growth stats and swaps in Boulder Toss, Wallop and Crunch.
// GNAR! is the same ability in both forms, but only Mega Gnar casts it: Mini Gnar shows it grey.
import type { FormAbilityRule } from "../form-abilities"
import {
	defineChampionOverride,
	defineForms,
	defineLevelStates,
} from "../overrides/define-champion-overrides"
import { WIKI, WIKI_DATA } from "./rule-helpers"

export const GNAR_RANGED_ATTACK_TYPE = defineChampionOverride({
	id: "gnar-ranged-attack-type",
	championKey: "Gnar",
	field: "attackType",
	since: "16.19",
	reason:
		"CommunityDragon lists both Ranged and Melee for Gnar, so the 175 range fallback picks melee; Mini Gnar, his starting and default form, is ranged",
	source: `${WIKI}Gnar`,
	apply: () => "ranged" as const,
})

export const GNAR_LEVEL_STATES = defineLevelStates({
	id: "gnar-level-states",
	championKey: "Gnar",
	since: "16.19",
	reason:
		"Mini Gnar's innate adds 225 to 325 bonus attack range, linear by level: 400 at level 1, 500 at 18",
	source: `${WIKI_DATA}Gnar/Mini_Gnar`,
	levelStates: [
		{
			fromLevel: 1,
			attackRange: { base: 400, perLevel: 100 / 17, growth: "linear" },
		},
	],
})

export const GNAR_FORMS = defineForms({
	id: "gnar-forms",
	championKey: "Gnar",
	since: "16.19",
	reason:
		"Mega Gnar is melee with his own growth stats; values from the GnarBig character record (the wiki's Mega Gnar entry is stale since V14.9)",
	source:
		"https://raw.communitydragon.org/16.19/game/data/characters/gnarbig/gnarbig.bin.json",
	forms: [
		{ id: "mini", name: "Mini Gnar" },
		{
			id: "mega",
			name: "Mega Gnar",
			attackType: "melee",
			stats: {
				health: { base: 640, perLevel: 122 },
				armor: { base: 36, perLevel: 6.7 },
				magicResist: { base: 33, perLevel: 4.8 },
				attackDamage: { base: 66, perLevel: 5.5 },
				attackSpeed: { base: 0.625, perLevelPercent: 0.5, ratio: 0.625 },
				attackRange: { base: 175, perLevel: 0 },
			},
		},
	],
})

export const GNAR_FORM_ABILITIES = {
	championKey: "Gnar",
	form: "mega",
	since: "16.19",
	reason:
		"Mega Gnar has Boulder Toss, Wallop and Crunch; their numbers are in the Mini ability's tooltip. GNAR! is the same ability, which only Mega Gnar casts: Mini Gnar shows it grey (GnarR's second icon) and can't cast it",
	source: `${WIKI_DATA}Gnar/Boulder_Toss`,
	spells: {
		Q: {
			spell: "GnarBigQ",
			lines: ["Boulder Damage", "Boulder Slow Amount", "Cooldown"],
			splitDescription: true,
		},
		W: {
			spell: "GnarBigW",
			lines: ["Wallop Damage"],
			splitDescription: true,
		},
		E: {
			spell: "GnarBigE",
			lines: ["Crunch Damage", "Cooldown"],
			splitDescription: true,
		},
		R: {
			spell: "GnarR",
			icon: 0,
			default: {
				icon: 1,
				// Wiki, Gnar: "Active: Mega Gnar throws enemies…"; Mini Gnar's GNAR! is passive only.
				unavailable: {
					reason: "Unavailable as Mini Gnar",
					source: `${WIKI}Gnar`,
				},
			},
		},
	},
} satisfies FormAbilityRule
