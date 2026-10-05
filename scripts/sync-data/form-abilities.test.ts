import { describe, expect, test } from "bun:test"
import { FORM_ABILITY_RULES } from "./form-abilities"
import { CHAMPION_FORMS } from "./overrides/champion-forms"
import {
	ABILITY_SLOTS,
	type Champion,
	championAbilitiesSchema,
	championSchema,
	formAbilitiesFitForms,
} from "./schemas/champion"
import {
	assertValidPatchRange,
	patchRangesOverlap,
} from "./schemas/patch-range"

async function currentChampion(key: string): Promise<Champion> {
	const { currentPatch } = await Bun.file(
		new URL("../../public/data/manifest.json", import.meta.url),
	).json()
	return championSchema.parse(
		await Bun.file(
			new URL(
				`../../public/data/${currentPatch}/champions/${key}.json`,
				import.meta.url,
			),
		).json(),
	)
}

/** Each slot's ability name in the form, the default one where the form keeps it. */
function namesInForm({ abilities }: Champion, form: string) {
	return ABILITY_SLOTS.map(
		(slot, index) =>
			(abilities.forms?.[form]?.[slot] ?? abilities.spells[index])?.name,
	)
}

describe("FORM_ABILITY_RULES", () => {
	test.each(
		FORM_ABILITY_RULES.map((rule) => [rule.championKey, rule] as const),
	)("%s names one of its forms other than the default", (championKey, rule) => {
		const forms = CHAMPION_FORMS.find(
			({ target }) => target === championKey,
		)?.apply(undefined)
		expect(forms?.slice(1).map(({ id }) => id)).toContain(rule.form)
		expect(Object.keys(rule.spells).length).toBeGreaterThan(0)
		expect(() => assertValidPatchRange(rule)).not.toThrow()
	})

	test("every ability a form can't cast has a reason to show and a wiki source", () => {
		const flags = FORM_ABILITY_RULES.flatMap(({ spells }) =>
			Object.values(spells).flatMap((spell) => [
				spell.unavailable,
				spell.default?.unavailable,
			]),
		).filter((flag) => flag !== undefined)

		expect(flags.length).toBeGreaterThan(0)
		for (const { reason, source } of flags) {
			expect(reason).toBeTruthy()
			expect(source).toStartWith("https://wiki.leagueoflegends.com/")
		}
	})

	test("one rule per champion form and patch", () => {
		for (const [index, rule] of FORM_ABILITY_RULES.entries()) {
			for (const earlier of FORM_ABILITY_RULES.slice(0, index)) {
				expect(
					earlier.championKey === rule.championKey &&
						earlier.form === rule.form &&
						patchRangesOverlap(earlier, rule),
				).toBe(false)
			}
		}
	})
})

describe("the champion schema's form abilities", () => {
	test("a form ability keeps its slot and the default ability's max rank", async () => {
		const { abilities } = await currentChampion("Jayce")
		const shockBlast = abilities.forms?.cannon?.Q
		if (!shockBlast) throw new Error("no Shock Blast")
		const withQ = (Q: typeof shockBlast) => ({
			...abilities,
			forms: { cannon: { Q } },
		})

		expect(championAbilitiesSchema.safeParse(withQ(shockBlast)).success).toBe(
			true,
		)
		expect(
			championAbilitiesSchema.safeParse(withQ({ ...shockBlast, slot: "W" }))
				.success,
		).toBe(false)
		expect(
			championAbilitiesSchema.safeParse(
				withQ({
					...shockBlast,
					maxRank: 5,
					cooldown: [8, 8, 8, 8, 8],
					cost: { text: "No Cost" },
					rankValues: [],
				}),
			).success,
		).toBe(false)
	})

	test("a form ability names one of the champion's other forms", async () => {
		const jayce = await currentChampion("Jayce")
		const cannon = jayce.abilities.forms?.cannon ?? {}

		expect(formAbilitiesFitForms(jayce)).toBe(true)
		expect(
			formAbilitiesFitForms({
				...jayce,
				abilities: { ...jayce.abilities, forms: { hammer: cannon } },
			}),
		).toBe(false)
		expect(formAbilitiesFitForms({ ...jayce, forms: undefined })).toBe(false)
	})
})

describe("form abilities in the current patch data (wiki)", () => {
	test("Jayce's Cannon swaps every ability; ranks stay per slot", async () => {
		const jayce = await currentChampion("Jayce")
		const cannon = jayce.abilities.forms?.cannon

		expect(namesInForm(jayce, "hammer")).toEqual([
			"To the Skies!",
			"Lightning Field",
			"Thundering Blow",
			"Mercury Cannon",
		])
		expect(namesInForm(jayce, "cannon")).toEqual([
			"Shock Blast",
			"Hyper Charge",
			"Acceleration Gate",
			"Mercury Hammer",
		])
		expect(cannon?.Q?.rankValues[0]?.values).toEqual([
			80, 121, 162, 203, 244, 285,
		])
		expect(cannon?.W?.cooldown).toEqual([13, 11.4, 9.8, 8.2, 6.6, 5])
		expect(cannon?.E?.rankValues[0]).toEqual({
			label: "Move Speed",
			values: [35, 40, 45, 50, 55, 60],
			unit: "%",
		})
		expect(cannon?.E?.cost).toEqual({
			values: [50, 50, 50, 50, 50, 50],
			unit: "Mana",
		})
	})

	test("Cougar Nidalee swaps Q, W and E and keeps Aspect of the Cougar", async () => {
		const nidalee = await currentChampion("Nidalee")

		expect(namesInForm(nidalee, "cougar")).toEqual([
			"Takedown",
			"Pounce",
			"Swipe",
			"Aspect Of The Cougar",
		])
		expect(nidalee.abilities.forms?.cougar?.Q).toMatchObject({
			cooldown: [6, 6, 6, 6, 6],
			cost: { text: "No Cost" },
		})
	})

	test("Spider Elise swaps every ability, with the human abilities' numbers", async () => {
		const elise = await currentChampion("Elise")
		const spider = elise.abilities.forms?.spider

		expect(namesInForm(elise, "human")).toEqual([
			"Neurotoxin",
			"Volatile Spiderling",
			"Cocoon",
			"Spider Form",
		])
		expect(namesInForm(elise, "spider")).toEqual([
			"Venomous Bite",
			"Skittering Frenzy",
			"Rappel",
			"Human Form",
		])
		expect(spider?.Q?.rankValues[0]?.values).toEqual([50, 80, 110, 140, 170])
		expect(spider?.E?.cooldown).toEqual([22, 21, 20, 19, 18])
		expect(spider?.R?.rankValues[0]?.values).toEqual([14, 24, 34, 44])
	})

	test("Mega Gnar swaps Q, W and E; Kled's dismount swaps Q", async () => {
		const gnar = await currentChampion("Gnar")
		const kled = await currentChampion("Kled")

		expect(namesInForm(gnar, "mega")).toEqual([
			"Boulder Toss",
			"Wallop",
			"Crunch",
			"GNAR!",
		])
		expect(gnar.abilities.forms?.mega?.Q?.rankValues[0]?.values).toEqual([
			45, 90, 135, 180, 225,
		])
		expect(namesInForm(kled, "dismounted")).toEqual([
			"Pocket Pistol",
			"Violent Tendencies",
			"Jousting",
			"Chaaaaaaaarge!!!",
		])
		expect(kled.abilities.forms?.dismounted?.Q?.rankValues).toEqual([
			{ label: "Damage", values: [35, 50, 65, 80, 95] },
			{ label: "Ammo Recharge", values: [18, 16, 14, 12, 10] },
		])
	})
})

/** Each slot's unavailable reason in the form, or undefined where the form casts it. */
function unavailableInForm({ abilities }: Champion, form: string) {
	return ABILITY_SLOTS.map(
		(slot, index) =>
			(abilities.forms?.[form]?.[slot] ?? abilities.spells[index])?.unavailable
				?.reason,
	)
}

describe("abilities a form can't cast, in the current patch data (wiki)", () => {
	test("Mini Gnar can't cast GNAR!; Mega Gnar casts every ability", async () => {
		const gnar = await currentChampion("Gnar")

		expect(unavailableInForm(gnar, "mini")).toEqual([
			undefined,
			undefined,
			undefined,
			"Unavailable as Mini Gnar",
		])
		expect(unavailableInForm(gnar, "mega")).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
		])
	})

	test("dismounted Kled casts only Pocket Pistol, Violent Tendencies included", async () => {
		const kled = await currentChampion("Kled")
		const dismounted = "Kled can't cast this while dismounted"

		expect(unavailableInForm(kled, "mounted")).toEqual([
			undefined,
			undefined,
			undefined,
			undefined,
		])
		expect(unavailableInForm(kled, "dismounted")).toEqual([
			undefined,
			dismounted,
			dismounted,
			dismounted,
		])
	})
})

/** The audit (issue 309): what each form shows differently from the default form, by slot. */
const AUDIT: Record<string, Record<string, readonly string[]>> = {
	Jayce: { cannon: ["passive", "Q", "W", "E", "R"] },
	Nidalee: { cougar: ["Q", "W", "E", "R"] },
	Elise: { spider: ["Q", "W", "E", "R"] },
	Gnar: { mega: ["Q", "W", "E", "R"] },
	Kled: { dismounted: ["passive", "Q", "W", "E", "R"] },
	Jinx: { rockets: ["Q"] },
	// Same icon and text in both forms in the game files: the form empowers the abilities.
	Shyvana: { dragon: [] },
	Belveth: { "true-form": [] },
}

const DISPLAY_SLOTS = ["passive", ...ABILITY_SLOTS] as const

/** What a slot shows in a form: its own entry, else the default form's. */
function displayInForm(
	{ abilities }: Champion,
	form: string,
	slot: (typeof DISPLAY_SLOTS)[number],
) {
	const own = abilities.forms?.[form]?.[slot]
	if (own) return own
	return slot === "passive"
		? abilities.passive
		: abilities.spells[ABILITY_SLOTS.indexOf(slot)]
}

describe("every form champion's slots in the current patch data", () => {
	test("the audit covers every champion with forms", () => {
		expect(CHAMPION_FORMS.map(({ target }) => target).toSorted()).toEqual(
			Object.keys(AUDIT).toSorted(),
		)
	})

	test.each(Object.entries(AUDIT))(
		"%s shows each slot as its form does",
		async (key, audit) => {
			const champion = await currentChampion(key)
			const defaultForm = champion.forms?.[0]?.id ?? ""
			for (const [form, changed] of Object.entries(audit)) {
				const differs = DISPLAY_SLOTS.filter((slot) => {
					const display = displayInForm(champion, form, slot)
					const fallback = displayInForm(champion, defaultForm, slot)
					expect(display?.name).toBeTruthy()
					expect(display?.icon).toMatch(/^https:\/\//)
					return JSON.stringify(display) !== JSON.stringify(fallback)
				})
				expect<string[]>(differs).toEqual([...changed])
			}
		},
	)

	test("Jinx's Q shows Pow-Pow with the Minigun and Fishbones with the Rockets, one line each", async () => {
		const jinx = await currentChampion("Jinx")
		const minigun = displayInForm(jinx, "minigun", "Q")
		const rockets = displayInForm(jinx, "rockets", "Q")

		expect(minigun).toMatchObject({
			name: "Switcheroo! (Pow-Pow)",
			icon: "https://raw.communitydragon.org/16.19/game/assets/characters/jinx/hud/icons2d/jinx_q2.png",
			rankValues: [
				{ label: "Minigun Total Attack Speed", values: [30, 55, 80, 105, 130] },
			],
		})
		expect(rockets).toMatchObject({
			name: "Switcheroo! (Fishbones)",
			icon: "https://raw.communitydragon.org/16.19/game/assets/characters/jinx/hud/icons2d/jinx_q1.png",
			rankValues: [
				{ label: "Rocket Bonus Range", values: [100, 125, 150, 175, 200] },
			],
		})
		expect(rockets?.description).toStartWith(
			"Jinx is using her rocket launcher",
		)
	})
})
