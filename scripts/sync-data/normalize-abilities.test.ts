import { describe, expect, test } from "bun:test"
import kennenBin from "./fixtures/champions/Kennen.bin.json"
import kennenDetail from "./fixtures/champions/Kennen.json"
import teemoBin from "./fixtures/champions/Teemo.bin.json"
import teemoDetail from "./fixtures/champions/Teemo.json"
import {
	normalizeAbilities,
	plainText,
	rankValues,
	spellCost,
} from "./normalize-abilities"
import { championAbilitiesSchema } from "./schemas/champion"

// Fixtures are trimmed copies of the Data Dragon 16.19.1 / CommunityDragon 16.19 cache.
const VERSION = "16.19.1"
const CDN = `https://ddragon.leagueoflegends.com/cdn/${VERSION}/img`

function teemo() {
	return normalizeAbilities(
		teemoDetail.data.Teemo,
		teemoBin as Record<string, unknown>,
		VERSION,
	).abilities
}

function line(
	abilities: ReturnType<typeof teemo>,
	slot: number,
	label: string,
) {
	return abilities.spells[slot]?.rankValues.find(
		(value) => value.label === label,
	)
}

describe("normalizeAbilities", () => {
	test("lists the passive and Q, W, E, R with Data Dragon names, icons and ranks", () => {
		const abilities = teemo()
		expect(championAbilitiesSchema.safeParse(abilities).success).toBe(true)
		expect(abilities.passive).toMatchObject({
			name: "Guerrilla Warfare",
			icon: `${CDN}/passive/TeemoPassive.png`,
		})
		expect(
			abilities.spells.map(({ slot, name, maxRank }) => [slot, name, maxRank]),
		).toEqual([
			["Q", "Blinding Dart", 5],
			["W", "Move Quick", 5],
			["E", "Toxic Shot", 5],
			["R", "Noxious Trap", 3],
		])
		expect(abilities.spells[3]?.icon).toBe(`${CDN}/spell/TeemoR.png`)
	})

	test("keeps cooldown and cost per rank, from rank 1", () => {
		const [q, , e, r] = teemo().spells
		expect(q?.cooldown).toEqual([7, 7, 7, 7, 7])
		expect(q?.cost).toEqual({ values: [70, 75, 80, 85, 90], unit: "Mana" })
		expect(r?.cost).toEqual({ values: [75, 55, 35], unit: "Mana" })
		expect(e?.cost).toEqual({ text: "Passive" })
	})

	test("reads rank-up values from the game files, skipping their rank 0 entry", () => {
		const abilities = teemo()
		// The game files list 35 (rank 0) before 80 (rank 1).
		expect(line(abilities, 0, "Damage")?.values).toEqual([
			80, 125, 170, 215, 260,
		])
		expect(line(abilities, 3, "Maximum Traps")?.values).toEqual([3, 4, 5])
		expect(line(abilities, 3, "Toss Range")?.values).toEqual([600, 750, 900])
	})

	test("applies the tooltip's multiplier and keeps percent values as percents", () => {
		expect(line(teemo(), 1, "Passive Move Speed")).toEqual({
			label: "Passive Move Speed",
			values: [12, 16, 20, 24, 28],
			unit: "%",
		})
	})

	test("names the champion's resource and reads legacy effect values", () => {
		const { abilities } = normalizeAbilities(
			kennenDetail.data.Kennen,
			kennenBin as Record<string, unknown>,
			VERSION,
		)
		expect(abilities.spells[0]?.rankValues.map(({ label }) => label)).toEqual([
			"Cooldown",
			"Energy Cost",
			"Damage",
		])
		expect(abilities.spells[0]?.cost).toEqual({
			values: [60, 55, 50, 45, 40],
			unit: "Energy",
		})
		expect(line(abilities, 1, "Damage (active)")?.values).toEqual([
			70, 95, 120, 145, 170,
		])
	})

	test("takes the default Summoner's Rift skill order recommendation", () => {
		expect(teemo().recommendedOrder).toEqual({
			firstPoints: ["E", "Q", "W", "E"],
			priority: ["R", "E", "Q", "W"],
		})
		const { abilities } = normalizeAbilities(
			kennenDetail.data.Kennen,
			kennenBin as Record<string, unknown>,
			VERSION,
		)
		expect(abilities.recommendedOrder).toEqual({
			firstPoints: ["Q", "W", "E", "Q"],
		})
	})

	test("reads the rank stats a rule names from the game files", () => {
		const rule = {
			championKey: "Teemo",
			slot: "W" as const,
			stat: "movementSpeedPercent" as const,
			dataValue: "PassiveMoveSpeedBonus",
			reason: "test",
			source: "test",
		}
		const { rankStats } = normalizeAbilities(
			teemoDetail.data.Teemo,
			teemoBin as Record<string, unknown>,
			VERSION,
			{
				rankStatRules: [
					rule,
					{ ...rule, dataValue: "ActiveMoveSpeedBonus", scale: 100 },
				],
			},
		)
		expect(rankStats).toEqual([
			{
				slot: "W",
				stat: "movementSpeedPercent",
				values: [0.12, 0.16, 0.2, 0.24, 0.28],
			},
			{ slot: "W", stat: "movementSpeedPercent", values: [24, 32, 40, 48, 56] },
		])
		expect(() =>
			normalizeAbilities(
				teemoDetail.data.Teemo,
				teemoBin as Record<string, unknown>,
				VERSION,
				{ rankStatRules: [{ ...rule, dataValue: "Renamed" }] },
			),
		).toThrow('no "Renamed" value per rank')
	})

	test("fails when the game files lack one of the spells", () => {
		const bin: Record<string, unknown> = { ...teemoBin }
		delete bin["Characters/Teemo/Spells/TeemoRAbility/TeemoR"]
		expect(() =>
			normalizeAbilities(teemoDetail.data.Teemo, bin, VERSION),
		).toThrow("no SpellObject for R")
	})
})

describe("rankValues", () => {
	const context = {
		maxRank: 3,
		cooldown: [10, 9, 8],
		cost: [50, 60, 70],
		values: new Map([["slowpercent", [0, -0.2, -0.3, -0.4, -0.5]]]),
		partype: "Mana",
	}

	test("resolves cost, cooldown and named values, with negative multipliers", () => {
		const { lines, skipped } = rankValues(
			{
				label: ["@AbilityResourceName@ Cost", "Cooldown", "Slow"],
				effect: [
					"{{ cost }} -> {{ costNL }}",
					"{{ cooldown }} -> {{ cooldownNL }}",
					"{{ slowpercent*-100.000000 }}% -> {{ slowpercentnl*-100.000000 }}%",
				],
			},
			context,
		)
		expect(skipped).toBe(0)
		expect(lines).toEqual([
			{ label: "Mana Cost", values: [50, 60, 70] },
			{ label: "Cooldown", values: [10, 9, 8] },
			{ label: "Slow", values: [20, 30, 40], unit: "%" },
		])
	})

	test("skips lines whose value is missing or not a single value", () => {
		const { lines, skipped } = rankValues(
			{
				label: ["Damage", "Ratio", "Recharge"],
				effect: [
					"{{ unknownvalue }} -> {{ unknownvalueNL }}",
					"{{ a }} + {{ b }} -> {{ aNL }} + {{ bNL }}",
					"{{ spell.other:value }} -> {{ spell.other:valueNL }}",
				],
			},
			context,
		)
		expect(lines).toEqual([])
		expect(skipped).toBe(3)
	})
})

describe("spellCost", () => {
	const cost = [40, 45]

	test("splits a cost text into per-rank values and a unit", () => {
		expect(
			spellCost("{{ cost }} {{ abilityresourcename }}", {
				cost,
				partype: "Energy",
			}),
		).toEqual({ values: cost, unit: "Energy" })
		expect(
			spellCost("{{ cost }} Mana per Second", { cost, partype: "Mana" }),
		).toEqual({ values: cost, unit: "Mana per Second" })
	})

	test("keeps a fixed text and drops texts that need other values", () => {
		expect(spellCost("No Cost", { cost, partype: "None" })).toEqual({
			text: "No Cost",
		})
		expect(
			spellCost("{{ healthcost }} Health", { cost, partype: "Mana" }),
		).toBeUndefined()
		expect(spellCost(undefined, { cost, partype: "Mana" })).toBeUndefined()
	})
})

describe("plainText", () => {
	test("removes the client's markup and icons, keeping line breaks", () => {
		expect(
			plainText(
				"Attacks apply poison %i:OnHit% <OnHit>On-Hit</OnHit>.<br><br><status>Blinds</status>  the target.",
			),
		).toBe("Attacks apply poison On-Hit.\n\nBlinds the target.")
	})
})
