import type { AbilitySlot } from "./schemas/champion"
import type { PatchRange } from "./schemas/patch-range"

export type FormSpellRule = {
	/** The spell object in the CommunityDragon character bin, by the last part of its path ("JayceShockBlast"). */
	spell: string
	/** Rank-up lines taken from the slot's default ability by label, when the spell's own tooltip has none or stale ones. */
	lines?: readonly string[]
	/** The default ability's description covers both forms, one paragraph each: the default form keeps the first. */
	splitDescription?: true
}

export type FormAbilityRule = PatchRange & {
	/** Data Dragon string id ("Jayce"). */
	championKey: string
	/** A form of `CHAMPION_FORMS` other than the default ("cannon"). */
	form: string
	/** The slots whose ability changes in that form; the rank stays per slot. */
	spells: Partial<Record<AbilitySlot, FormSpellRule>>
	/** Which abilities change, and how their ranks follow the slot. */
	reason: string
	source: string
}

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

/**
 * Abilities another form swaps in. Data Dragon lists one spell per slot; the other form's spells
 * come from the game files, read by the sync like the default ones (README, Game data).
 */
export const FORM_ABILITY_RULES: readonly FormAbilityRule[] = [
	{
		championKey: "Jayce",
		form: "cannon",
		since: "16.19",
		reason:
			"Mercury Cannon swaps in Shock Blast, Hyper Charge, Acceleration Gate and Transform Mercury Hammer; a slot's rank raises both stances' ability",
		source: `${WIKI}Jayce`,
		spells: {
			Q: { spell: "JayceShockBlast", splitDescription: true },
			W: { spell: "JayceHyperCharge", splitDescription: true },
			E: { spell: "JayceAccelerationGate", splitDescription: true },
			R: { spell: "JayceStanceGtH", splitDescription: true },
		},
	},
	{
		championKey: "Nidalee",
		form: "cougar",
		since: "16.19",
		reason:
			"Cougar Nidalee has Takedown, Pounce and Swipe; they scale with Aspect of the Cougar's rank, so their numbers are R's rank-up lines",
		source: `${WIKI}Template:Data_Nidalee/Aspect_of_the_Cougar`,
		spells: {
			Q: { spell: "Takedown" },
			W: { spell: "Pounce" },
			E: { spell: "Swipe" },
		},
	},
	{
		championKey: "Elise",
		form: "spider",
		since: "16.19",
		reason:
			"Spider Elise has Venomous Bite, Skittering Frenzy, Rappel and Human Form; Venomous Bite and Rappel keep their numbers in the human ability's tooltip, and Human Form's own tooltip is stale (12-42 bite damage, the wiki's Spider Queen has 14-44)",
		source: `${WIKI}Template:Data_Elise/Spider_Form_/_Human_Form`,
		spells: {
			Q: {
				spell: "EliseSpiderQ",
				lines: ["Venomous Bite Damage"],
				splitDescription: true,
			},
			W: { spell: "EliseSpiderW", splitDescription: true },
			E: {
				spell: "EliseSpiderE",
				lines: ["Cooldown (Rappel)", "Damage and Healing Increase"],
				splitDescription: true,
			},
			R: {
				spell: "EliseRSpider",
				lines: [
					"Spider Form Bite Damage",
					"Spiderling Bonus Damage",
					"Maximum Number of Spiderlings",
					"Spiderling Armor",
					"Spiderling Magic Resist",
				],
			},
		},
	},
	{
		championKey: "Gnar",
		form: "mega",
		since: "16.19",
		reason:
			"Mega Gnar has Boulder Toss, Wallop and Crunch; their numbers are in the Mini ability's tooltip. GNAR! is the same ability in both forms",
		source: `${WIKI}Template:Data_Gnar/Boulder_Toss`,
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
		},
	},
	{
		championKey: "Kled",
		form: "dismounted",
		since: "16.19",
		reason:
			"Dismounted Kled's Bear Trap on a Rope becomes Pocket Pistol, ranked by Q",
		source: `${WIKI}Template:Data_Kled/Pocket_Pistol`,
		spells: { Q: { spell: "KledRiderQ", splitDescription: true } },
	},
]
