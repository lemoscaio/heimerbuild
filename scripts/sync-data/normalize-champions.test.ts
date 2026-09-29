import { describe, expect, test } from "bun:test"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import championList from "./fixtures/champions/champion.json"
import garenBin from "./fixtures/champions/Garen.bin.json"
import garenDetail from "./fixtures/champions/Garen.json"
import heimerdingerBin from "./fixtures/champions/Heimerdinger.bin.json"
import heimerdingerDetail from "./fixtures/champions/Heimerdinger.json"
import kennenBin from "./fixtures/champions/Kennen.bin.json"
import kennenDetail from "./fixtures/champions/Kennen.json"
import {
	buildChampionIndex,
	normalizeChampion,
	writeChampions,
} from "./normalize-champions"
import { defineChampionOverride } from "./overrides/champion-overrides"
import { championSchema } from "./schemas/champion"

// Fixtures are trimmed copies of the Data Dragon 16.19.1 / CommunityDragon 16.19 cache.
const VERSION = "16.19.1"
const ROOT = "Characters/Heimerdinger/CharacterRecords/Root"
const FIXTURES = join(import.meta.dir, "fixtures/champions")

function heimerdinger() {
	return normalizeChampion(heimerdingerDetail, heimerdingerBin, VERSION)
}

function withRecord(changes: Record<string, unknown>) {
	return { [ROOT]: { ...heimerdingerBin[ROOT], ...changes } }
}

describe("buildChampionIndex", () => {
	const index = buildChampionIndex(championList, VERSION)

	test("lists every Data Dragon champion, including the newest ones", () => {
		expect(index).toHaveLength(Object.keys(championList.data).length)
		expect(index).toHaveLength(173)
		const names = index.map((champion) => champion.name)
		expect(names).toContain("Zaahen")
		expect(names).toContain("Locke")
	})

	test("is sorted by name and stays under 60 KB", () => {
		const names = index.map((champion) => champion.name)
		expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")))
		expect(Buffer.byteLength(JSON.stringify(index))).toBeLessThan(60 * 1024)
	})

	test("uses the string id as key and the numeric key as id", () => {
		expect(index.find((champion) => champion.name === "Wukong")).toEqual({
			key: "MonkeyKing",
			id: 62,
			name: "Wukong",
			title: "the Monkey King",
			roles: ["FIGHTER", "TANK"],
			icon: `https://ddragon.leagueoflegends.com/cdn/${VERSION}/img/champion/MonkeyKing.png`,
		})
	})
})

describe("normalizeChampion", () => {
	const cases = [
		{
			name: "Heimerdinger (ranged, mana)",
			detail: heimerdingerDetail,
			bin: heimerdingerBin,
			identity: {
				key: "Heimerdinger",
				id: 74,
				roles: ["MAGE", "SUPPORT"],
				attackType: "ranged",
				resource: "MANA",
			},
			stats: {
				health: { base: 558, perLevel: 105 },
				healthRegen: { base: 7, perLevel: 0.55 },
				mana: { base: 385, perLevel: 20 },
				manaRegen: { base: 8, perLevel: 0.8 },
				armor: { base: 19, perLevel: 4.2 },
				magicResist: { base: 30, perLevel: 1.3 },
				attackDamage: { base: 56, perLevel: 2.7 },
				attackSpeed: { base: 0.658, perLevelPercent: 1.36, ratio: 0.625 },
				critChance: { base: 0, perLevel: 0 },
				movementSpeed: { base: 340, perLevel: 0 },
				attackRange: { base: 550, perLevel: 0 },
			},
		},
		{
			name: "Garen (melee, no resource)",
			detail: garenDetail,
			bin: garenBin,
			identity: {
				key: "Garen",
				id: 86,
				roles: ["FIGHTER", "TANK"],
				attackType: "melee",
				resource: "NONE",
			},
			stats: {
				health: { base: 690, perLevel: 98 },
				healthRegen: { base: 8, perLevel: 0.5 },
				mana: { base: 0, perLevel: 0 },
				manaRegen: { base: 0, perLevel: 0 },
				armor: { base: 38, perLevel: 4.2 },
				magicResist: { base: 32, perLevel: 1.55 },
				attackDamage: { base: 69, perLevel: 4.5 },
				attackSpeed: { base: 0.625, perLevelPercent: 3.65, ratio: 0.625 },
				critChance: { base: 0, perLevel: 0 },
				movementSpeed: { base: 340, perLevel: 0 },
				attackRange: { base: 175, perLevel: 0 },
			},
		},
		{
			name: "Kennen (ranged, energy)",
			detail: kennenDetail,
			bin: kennenBin,
			identity: {
				key: "Kennen",
				id: 85,
				roles: ["MAGE"],
				attackType: "ranged",
				resource: "ENERGY",
			},
			stats: {
				health: { base: 580, perLevel: 98 },
				healthRegen: { base: 5.5, perLevel: 0.65 },
				mana: { base: 200, perLevel: 0 },
				manaRegen: { base: 50, perLevel: 0 },
				armor: { base: 29, perLevel: 4.95 },
				magicResist: { base: 30, perLevel: 1.3 },
				attackDamage: { base: 48, perLevel: 3.75 },
				attackSpeed: { base: 0.625, perLevelPercent: 3.4, ratio: 0.69 },
				critChance: { base: 0, perLevel: 0 },
				movementSpeed: { base: 335, perLevel: 0 },
				attackRange: { base: 550, perLevel: 0 },
			},
		},
	]

	test.each(cases)("$name: identity fields", ({ detail, bin, identity }) => {
		const champion = normalizeChampion(detail, bin, VERSION)
		const [source] = Object.values(detail.data)
		expect(champion).toMatchObject(identity)
		expect(champion.name).toBe(source.name)
		expect(champion.title).toBe(source.title)
		expect(champion.lore).toBe(source.lore)
		expect(champion.icon).toBe(
			`https://ddragon.leagueoflegends.com/cdn/${VERSION}/img/champion/${identity.key}.png`,
		)
	})

	test.each(cases)("$name: stats", ({ detail, bin, stats }) => {
		expect(normalizeChampion(detail, bin, VERSION).stats).toEqual(stats)
	})

	test("takes attack damage growth and attack speed ratio from CommunityDragon", () => {
		const { stats } = heimerdinger()
		expect(
			heimerdingerDetail.data.Heimerdinger.stats.attackdamageperlevel,
		).toBe(0)
		expect(stats.attackDamage.perLevel).toBe(2.7)
		expect(stats.attackSpeed).toEqual({
			base: 0.658,
			perLevelPercent: 1.36,
			ratio: 0.625,
		})
	})

	test("falls back to Data Dragon when the game file omits a stat", () => {
		const record = {
			...heimerdingerBin[ROOT],
			attackSpeedRatioModifiable: undefined,
			damagePerLevelModifiable: undefined,
		}
		const { stats } = normalizeChampion(
			heimerdingerDetail,
			{ [ROOT]: record },
			VERSION,
		)
		expect(stats.attackSpeed.ratio).toBe(0.658)
		expect(stats.attackDamage.perLevel).toBe(0)
	})

	test("derives attack type from attack range when the champion swaps forms", () => {
		const bothIdentities = withRecord({
			purchaseIdentities: ["Ranged", "Melee"],
		})
		expect(
			normalizeChampion(heimerdingerDetail, bothIdentities, VERSION).attackType,
		).toBe("ranged")

		const detail = structuredClone(heimerdingerDetail)
		detail.data.Heimerdinger.stats.attackrange = 175
		expect(normalizeChampion(detail, bothIdentities, VERSION).attackType).toBe(
			"melee",
		)
	})

	test("rejects Data Dragon input with a missing stat", () => {
		const detail = structuredClone(heimerdingerDetail)
		const { hp: _, ...stats } = detail.data.Heimerdinger.stats
		const broken = {
			data: { Heimerdinger: { ...detail.data.Heimerdinger, stats } },
		}
		expect(() => normalizeChampion(broken, heimerdingerBin, VERSION)).toThrow()
	})

	test("rejects a character bin without a root record", () => {
		expect(() => normalizeChampion(heimerdingerDetail, {}, VERSION)).toThrow(
			"expected 1 CharacterRecords/Root, found 0",
		)
	})
})

describe("championSchema", () => {
	test("rejects an unknown role, a missing stat and an unexpected field", () => {
		const champion = heimerdinger()
		const { health: _, ...stats } = champion.stats
		expect(
			championSchema.safeParse({ ...champion, roles: ["JUNGLER"] }).success,
		).toBe(false)
		expect(championSchema.safeParse({ ...champion, stats }).success).toBe(false)
		expect(championSchema.safeParse({ ...champion, skins: [] }).success).toBe(
			false,
		)
		expect(championSchema.safeParse(champion).success).toBe(true)
	})
})

describe("writeChampions", () => {
	async function withDirs(
		run: (cacheDir: string, outDir: string) => Promise<void>,
	) {
		const cacheDir = await mkdtemp(join(tmpdir(), "champions-cache-"))
		const outDir = await mkdtemp(join(tmpdir(), "champions-out-"))
		try {
			await Bun.write(
				join(cacheDir, "ddragon/champion/Heimerdinger.json"),
				Bun.file(join(FIXTURES, "Heimerdinger.json")),
			)
			await Bun.write(
				join(cacheDir, "cdragon/characters/Heimerdinger.bin.json"),
				Bun.file(join(FIXTURES, "Heimerdinger.bin.json")),
			)
			await run(cacheDir, outDir)
		} finally {
			await rm(cacheDir, { recursive: true, force: true })
			await rm(outDir, { recursive: true, force: true })
		}
	}

	function writeList(cacheDir: string, ids: string[]) {
		const data = Object.fromEntries(
			ids.map((id) => [id, { ...championList.data.Heimerdinger, id }]),
		)
		return Bun.write(
			join(cacheDir, "ddragon/champion.json"),
			JSON.stringify({ data }),
		)
	}

	test("writes the index and one validated file per champion", () =>
		withDirs(async (cacheDir, outDir) => {
			await writeList(cacheDir, ["Heimerdinger"])

			const result = await writeChampions(cacheDir, outDir, VERSION)

			expect(result.champions).toBe(1)
			expect(await readdir(join(outDir, "champions"))).toEqual([
				"Heimerdinger.json",
			])
			const written = JSON.parse(
				await readFile(join(outDir, "champions/Heimerdinger.json"), "utf8"),
			)
			expect(written).toEqual(heimerdinger())
		}))

	test("writes the overridden champion and reports the override", () =>
		withDirs(async (cacheDir, outDir) => {
			await writeList(cacheDir, ["Heimerdinger"])
			const override = defineChampionOverride({
				id: "heimerdinger-ranged",
				championKey: "Heimerdinger",
				field: "attackType",
				since: "16.19",
				reason: "test",
				apply: () => "melee",
			})

			const result = await writeChampions(cacheDir, outDir, VERSION, {
				overrides: [override],
			})

			const written = JSON.parse(
				await readFile(join(outDir, "champions/Heimerdinger.json"), "utf8"),
			)
			expect(written).toEqual({ ...heimerdinger(), attackType: "melee" })
			expect(result.overrides.applied).toEqual([
				{ id: "heimerdinger-ranged", entity: "champion Heimerdinger" },
			])
		}))

	test("writes nothing when an override breaks the champion schema", () =>
		withDirs(async (cacheDir, outDir) => {
			await writeList(cacheDir, ["Heimerdinger"])
			const override = defineChampionOverride({
				id: "bad-resource",
				championKey: "Heimerdinger",
				field: "resource",
				since: "16.19",
				reason: "test",
				apply: () => "not valid",
			})

			await expect(
				writeChampions(cacheDir, outDir, VERSION, { overrides: [override] }),
			).rejects.toThrow("Heimerdinger:")
			expect(await readdir(outDir)).toEqual([])
		}))

	test("writes nothing when one champion fails", () =>
		withDirs(async (cacheDir, outDir) => {
			await writeList(cacheDir, ["Heimerdinger", "Missing"])

			await expect(writeChampions(cacheDir, outDir, VERSION)).rejects.toThrow(
				"Missing:",
			)
			expect(await readdir(outDir)).toEqual([])
		}))
})
