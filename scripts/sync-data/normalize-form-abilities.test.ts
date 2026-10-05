import { describe, expect, test } from "bun:test"
import jayceBin from "./fixtures/champions/Jayce.bin.json"
import jayceDetail from "./fixtures/champions/Jayce.json"
import jayceStrings from "./fixtures/champions/Jayce.stringtable.json"
import type { FormAbilityRule } from "./form-abilities"
import { normalizeAbilities } from "./normalize-abilities"
import {
	formSpellNames,
	levelUpTip,
	normalizeFormAbilities,
} from "./normalize-form-abilities"
import { championAbilitiesSchema } from "./schemas/champion"

// Trimmed copies of the Data Dragon 16.19.1 / CommunityDragon 16.19 cache.
const VERSION = "16.19.1"
const bin = jayceBin as Record<string, unknown>
const MODE_TEXTS: Record<string, string> = {
	game_buff_tooltip_jaycehammer:
		"<titleLeft>Hammer</titleLeft><mainText>Jayce swings his <b>hammer</b>.</mainText>",
	game_buff_tooltip_jaycecannon:
		"<titleLeft>Cannon</titleLeft><mainText>Jayce fires his cannon.</mainText>",
}
const strings = (key: string) =>
	MODE_TEXTS[key] ?? (jayceStrings.entries as Record<string, string>)[key]

const CANNON: FormAbilityRule = {
	championKey: "Jayce",
	form: "cannon",
	since: "16.19",
	reason: "test",
	source: "test",
	spells: {
		Q: { spell: "JayceShockBlast", splitDescription: true },
		W: { spell: "JayceHyperCharge", splitDescription: true },
		E: { spell: "JayceAccelerationGate", splitDescription: true },
		R: { spell: "JayceStanceGtH", splitDescription: true },
	},
}

function jayce(rules: readonly FormAbilityRule[] = [CANNON]) {
	const { abilities } = normalizeAbilities(jayceDetail.data.Jayce, bin, VERSION)
	return normalizeFormAbilities(abilities, rules, {
		bin,
		strings,
		partype: "Mana",
		cdragonPatch: "16.19",
	})
}

describe("normalizeFormAbilities", () => {
	test("adds the other form's abilities and gives each form its part of the shared name", () => {
		const { abilities } = jayce()

		expect(championAbilitiesSchema.safeParse(abilities).success).toBe(true)
		expect(abilities.spells.map(({ name }) => name)).toEqual([
			"To the Skies!",
			"Lightning Field",
			"Thundering Blow",
			"Mercury Cannon",
		])
		expect(
			Object.values(abilities.forms?.cannon ?? {}).map(({ name }) => name),
		).toEqual([
			"Shock Blast",
			"Hyper Charge",
			"Acceleration Gate",
			"Mercury Hammer",
		])
	})

	test("reads the form ability's icon, cooldown, cost and rank-up lines from the game files (wiki: Shock Blast)", () => {
		const shockBlast = jayce().abilities.forms?.cannon?.Q

		expect(shockBlast).toMatchObject({
			slot: "Q",
			maxRank: 6,
			icon: "https://raw.communitydragon.org/16.19/game/assets/characters/jayce/hud/icons2d/jayceq_ranged.png",
			cooldown: [8, 8, 8, 8, 8, 8],
			cost: { values: [55, 60, 65, 70, 75, 80], unit: "Mana" },
		})
		expect(shockBlast?.rankValues).toEqual([
			{ label: "Damage", values: [80, 121, 162, 203, 244, 285] },
			{ label: "Mana Cost", values: [55, 60, 65, 70, 75, 80] },
		])
		// Hyper Charge: 13 to 5 s, float32 values rounded.
		expect(jayce().abilities.forms?.cannon?.W?.cooldown).toEqual([
			13, 11.4, 9.8, 8.2, 6.6, 5,
		])
	})

	test("splits a description that covers both forms, and a spell without mana costs nothing", () => {
		const { spells, forms } = jayce().abilities

		expect(spells[0].description).toStartWith("Hammer Stance: Leaps")
		expect(spells[0].description).not.toContain("Cannon Stance")
		// The form's own summary wins over the second paragraph.
		expect(forms?.cannon?.Q?.description).toStartWith(
			"Fires an orb of electricity",
		)
		expect(forms?.cannon?.R?.cost).toEqual({ text: "No Cost" })
	})

	test("takes named lines from the default ability when the rule lists them", () => {
		const rule: FormAbilityRule = {
			...CANNON,
			spells: { Q: { spell: "JayceShockBlast", lines: ["Slow"] } },
		}

		const { abilities } = jayce([rule])

		expect(abilities.forms?.cannon?.Q?.rankValues).toEqual([
			{ label: "Slow", values: [35, 40, 45, 50, 55, 60], unit: "%" },
		])
		// Without `splitDescription`, both forms keep the whole description.
		expect(abilities.forms?.cannon?.Q?.description).toStartWith("Fires")
		expect(abilities.spells[0].description).toContain("Cannon Stance")
	})

	test("the slot's own spell keeps the ability and changes only its look in each form", () => {
		const rule: FormAbilityRule = {
			...CANNON,
			passive: { spell: "JaycePassive", icon: 1, default: { icon: 0 } },
			spells: {
				Q: {
					spell: "JayceToTheSkies",
					icon: 1,
					lines: ["Slow"],
					modeText: "game_buff_tooltip_JayceCannon",
					default: {
						lines: ["Damage"],
						modeText: "game_buff_tooltip_JayceHammer",
					},
				},
			},
		}

		const { abilities } = jayce([rule])
		const [hammerQ] = abilities.spells
		const cannonQ = abilities.forms?.cannon?.Q

		expect(championAbilitiesSchema.safeParse(abilities).success).toBe(true)
		expect(hammerQ).toMatchObject({
			name: "To the Skies! / Shock Blast (Hammer)",
			description: "Jayce swings his hammer.",
			cooldown: [16, 14, 12, 10, 8, 6],
		})
		expect(hammerQ.rankValues.map(({ label }) => label)).toEqual(["Damage"])
		expect(cannonQ).toMatchObject({
			name: "To the Skies! / Shock Blast (Cannon)",
			description: "Jayce fires his cannon.",
			icon: "https://raw.communitydragon.org/16.19/game/assets/characters/jayce/hud/icons2d/jayceq_melee.png",
			cooldown: hammerQ.cooldown,
			cost: hammerQ.cost,
		})
		expect(cannonQ?.rankValues.map(({ label }) => label)).toEqual(["Slow"])
		expect(abilities.passive.icon).toEndWith("/jaycep_melee.png")
		expect(abilities.forms?.cannon?.passive).toMatchObject({
			name: "Hextech Capacitor",
			icon: "https://raw.communitydragon.org/16.19/game/assets/characters/jayce/hud/icons2d/jaycep_ranged.png",
		})
	})

	test("fails on a spell or line the game files lack", () => {
		expect(() =>
			jayce([{ ...CANNON, spells: { Q: { spell: "JayceRenamed" } } }]),
		).toThrow("cannon Q: no SpellObject JayceRenamed")
		expect(() =>
			jayce([
				{
					...CANNON,
					spells: { Q: { spell: "JayceShockBlast", lines: ["Renamed"] } },
				},
			]),
		).toThrow('no "Renamed" line')
	})

	test("leaves a champion without rules as it was", () => {
		const { abilities } = normalizeAbilities(
			jayceDetail.data.Jayce,
			bin,
			VERSION,
		)

		expect(
			normalizeFormAbilities(abilities, [], {
				bin,
				strings,
				partype: "Mana",
				cdragonPatch: "16.19",
			}).abilities,
		).toBe(abilities)
	})
})

describe("formSpellNames", () => {
	test("splits Riot's shared name, whichever way round the form's own name is", () => {
		expect(
			formSpellNames("Boomerang Throw / Boulder Toss", "Boulder Toss / Hop"),
		).toEqual({ defaultName: "Boomerang Throw", formName: "Boulder Toss" })
		expect(formSpellNames("Neurotoxin / Venomous Bite", undefined)).toEqual({
			defaultName: "Neurotoxin",
			formName: "Venomous Bite",
		})
		expect(formSpellNames("Bear Trap on a Rope", "Pocket Pistol")).toEqual({
			defaultName: "Bear Trap on a Rope",
			formName: "Pocket Pistol",
		})
	})

	test("fails when neither name gives the form's", () => {
		expect(() => formSpellNames("Spider Form", undefined)).toThrow(
			'no name for the form of "Spider Form"',
		)
	})
})

describe("levelUpTip", () => {
	test("turns the client's rank-up list into Data Dragon's leveltip shape", () => {
		expect(
			levelUpTip(
				"<postScriptLeft>Damage<br>@AbilityResourceName@ Cost</postScriptLeft><postScriptRight>@BaseDamage@ -> @BaseDamageNL@<br>@Slow*-100.000000@% -> @SlowNL*-100.000000@%</postScriptRight>",
			),
		).toEqual({
			label: ["Damage", "@AbilityResourceName@ Cost"],
			effect: [
				"{{ BaseDamage }} -> {{ BaseDamageNL }}",
				"{{ Slow*-100.000000 }}% -> {{ SlowNL*-100.000000 }}%",
			],
		})
		expect(levelUpTip(undefined)).toEqual({ label: [], effect: [] })
	})
})
