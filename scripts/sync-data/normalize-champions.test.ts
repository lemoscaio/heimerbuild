import { describe, expect, test } from "bun:test"
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import championList from "./fixtures/champions/champion.json"
import heimerdingerBin from "./fixtures/champions/Heimerdinger.bin.json"
import heimerdingerDetail from "./fixtures/champions/Heimerdinger.json"
import {
	buildChampionIndex,
	normalizeChampion,
	writeChampions,
} from "./normalize-champions"
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
	test("Heimerdinger matches the snapshot", () => {
		const champion = heimerdinger()
		expect(champion.stats.health).toEqual({ base: 558, perLevel: 105 })
		expect(champion).toMatchSnapshot()
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

	test("writes nothing when one champion fails", () =>
		withDirs(async (cacheDir, outDir) => {
			await writeList(cacheDir, ["Heimerdinger", "Missing"])

			await expect(writeChampions(cacheDir, outDir, VERSION)).rejects.toThrow(
				"Missing:",
			)
			expect(await readdir(outDir)).toEqual([])
		}))
})
