import type { Champion, ChampionForm } from "../schemas/champion"
import type { FieldOverride } from "./apply-overrides"

/** Sets a champion's `forms`: an override like the others, so it is logged, ranged by patch and validated. */
export function defineForms({
	championKey,
	forms,
	...override
}: Omit<FieldOverride<Champion, "forms">, "target" | "field" | "apply"> & {
	/** Data Dragon string id ("MonkeyKing"). */
	championKey: string
	/** The first is the default form, the one Riot's data describes. */
	forms: ChampionForm[]
}): FieldOverride<Champion, "forms"> {
	return {
		...override,
		target: championKey,
		field: "forms",
		apply: () => forms,
	}
}

/** Forms the player switches between; Riot's data has only the starting one. */
export const CHAMPION_FORMS = [
	defineForms({
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
	}),
	defineForms({
		id: "kled-forms",
		championKey: "Kled",
		since: "16.19",
		reason:
			"Dismounted Kled has 410 health growing by 84, 305 movement speed and 250 range (the wiki's Kled entry); the KledRider record disagrees with the wiki, so it is not used",
		source: "https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data",
		forms: [
			{ id: "mounted", name: "Mounted" },
			{
				id: "dismounted",
				name: "Dismounted",
				stats: {
					health: { base: 410, perLevel: 84 },
					movementSpeed: { base: 305, perLevel: 0 },
					attackRange: { base: 250, perLevel: 0 },
				},
			},
		],
	}),
	defineForms({
		id: "nidalee-forms",
		championKey: "Nidalee",
		since: "16.19",
		reason:
			"Cougar Nidalee is melee with 125 range; the NidaleeCougar record matches the wiki's Aspect of the Cougar",
		source:
			"https://raw.communitydragon.org/16.19/game/data/characters/nidaleecougar/nidaleecougar.bin.json",
		forms: [
			{ id: "human", name: "Human" },
			{
				id: "cougar",
				name: "Cougar",
				attackType: "melee",
				stats: { attackRange: { base: 125, perLevel: 0 } },
			},
		],
	}),
	defineForms({
		id: "elise-forms",
		championKey: "Elise",
		since: "16.19",
		reason:
			"Spider Elise is melee with 125 range and 355 movement speed; the EliseSpider record matches the wiki's Spider Form",
		source:
			"https://raw.communitydragon.org/16.19/game/data/characters/elisespider/elisespider.bin.json",
		forms: [
			{ id: "human", name: "Human" },
			{
				id: "spider",
				name: "Spider",
				attackType: "melee",
				stats: {
					movementSpeed: { base: 355, perLevel: 0 },
					attackRange: { base: 125, perLevel: 0 },
				},
			},
		],
	}),
	defineForms({
		id: "jayce-forms",
		championKey: "Jayce",
		since: "16.19",
		reason:
			"Cannon Jayce is ranged with 500 range; Hammer's bonus resistances depend on the R rank and are not modeled yet",
		source:
			"https://wiki.leagueoflegends.com/en-us/Template:Data_Jayce/Transform_Mercury_Cannon",
		forms: [
			{ id: "hammer", name: "Hammer" },
			{
				id: "cannon",
				name: "Cannon",
				attackType: "ranged",
				stats: { attackRange: { base: 500, perLevel: 0 } },
			},
		],
	}),
]
