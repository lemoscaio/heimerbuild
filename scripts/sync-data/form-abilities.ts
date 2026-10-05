import type { AbilitySlot } from "./schemas/champion"
import type { PatchRange } from "./schemas/patch-range"

/** How a form shows a slot, when it differs from the ability's Data Dragon look. */
export type FormDisplay = {
	/** Which of the spell's icons (`mImgIconName`, 0 first) the form shows: Cougar Nidalee's R is 1. */
	icon?: number
	/** Rank-up lines taken from the slot's default ability by label, when the spell's own tooltip has none, stale ones or both forms' lines. */
	lines?: readonly string[]
	/** A game text (string table key) whose title names the form's mode and whose main text describes it: "Switcheroo! (Pow-Pow)". */
	modeText?: string
}

export type FormSpellRule = FormDisplay & {
	/**
	 * The spell object in the CommunityDragon character bin, by the last part of its path. The slot's
	 * own spell ("JinxQ") keeps the ability and changes only how it shows; another one ("JayceShockBlast") swaps it.
	 */
	spell: string
	/** The default ability's description covers both forms, one paragraph each: the default form keeps the first. */
	splitDescription?: true
	/** How the default form shows the slot, when Data Dragon's look is not the game's (Jinx's Q on the minigun). */
	default?: FormDisplay
}

/** The same passive with another icon per form (Jayce's hammer and cannon). */
export type FormPassiveRule = {
	/** The passive's spell object, whose `mImgIconName` lists one icon per form. */
	spell: string
	icon: number
	default?: { icon: number }
}

export type FormAbilityRule = PatchRange & {
	/** Data Dragon string id ("Jayce"). */
	championKey: string
	/** A form of `CHAMPION_FORMS` other than the default ("cannon"). */
	form: string
	/** The slots whose ability or look changes in that form; the rank stays per slot. */
	spells: Partial<Record<AbilitySlot, FormSpellRule>>
	passive?: FormPassiveRule
	/** What changes, and how the ranks follow the slot. */
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
			"Mercury Cannon swaps in Shock Blast, Hyper Charge, Acceleration Gate and Transform Mercury Hammer; a slot's rank raises both stances' ability. Hextech Capacitor shows the hammer or the cannon (JaycePassive icons; Data Dragon's is an older one)",
		source: `${WIKI}Jayce`,
		passive: { spell: "JaycePassive", icon: 1, default: { icon: 0 } },
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
			"Cougar Nidalee has Takedown, Pounce and Swipe; they scale with Aspect of the Cougar's rank, so their numbers are R's rank-up lines. Her R keeps the ability with the human-face icon (AspectOfTheCougar's second icon)",
		source: `${WIKI}Template:Data_Nidalee/Aspect_of_the_Cougar`,
		spells: {
			Q: { spell: "Takedown" },
			W: { spell: "Pounce" },
			E: { spell: "Swipe" },
			R: { spell: "AspectOfTheCougar", icon: 1 },
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
			"Mega Gnar has Boulder Toss, Wallop and Crunch; their numbers are in the Mini ability's tooltip. GNAR! is the same ability, which only Mega Gnar casts: Mini Gnar shows it grey (GnarR's second icon)",
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
			R: { spell: "GnarR", icon: 0, default: { icon: 1 } },
		},
	},
	{
		championKey: "Kled",
		form: "dismounted",
		since: "16.19",
		reason:
			"Dismounted Kled's Bear Trap on a Rope becomes Pocket Pistol, ranked by Q. He cannot cast his other abilities: Jousting and Chaaaaaaaarge!!! show grey (their second icons; Violent Tendencies has none), and Skaarl the Cowardly Lizard shows Skaarl fleeing",
		source: `${WIKI}Template:Data_Kled/Skaarl_the_Cowardly_Lizard`,
		passive: { spell: "KledPassive", icon: 1 },
		spells: {
			Q: { spell: "KledRiderQ", splitDescription: true },
			E: { spell: "KledE", icon: 1 },
			R: { spell: "KledR", icon: 1 },
		},
	},
	{
		championKey: "Jinx",
		form: "rockets",
		since: "16.19",
		reason:
			"Switcheroo! keeps its rank and swaps the weapon: the HUD shows Pow-Pow or Fishbones (JinxQ's two icons) and the game describes each in its buff (JinxQIcon, JinxQ); each weapon keeps its own rank-up line",
		source: `${WIKI}Template:Data_Jinx/Switcheroo!`,
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
	},
]
