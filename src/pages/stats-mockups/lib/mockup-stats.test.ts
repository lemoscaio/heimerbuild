import { describe, expect, test } from "bun:test"
import { championSchema } from "@schemas/champion"
import { ItemsFileSchema } from "@schemas/item"
import { runesFileSchema } from "@schemas/rune"
import type { StatName } from "@/lib/stats/compute-stats"
import { MOCKUP_BUILDS, type MockupBuildId } from "./mockup-builds"
import { type MockupGameData, mockupStats } from "./mockup-stats"

const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()
const { items } = ItemsFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
)
const runes = runesFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/runes.json`, DATA)).json(),
)

async function gameData(id: MockupBuildId): Promise<MockupGameData> {
	const champion = championSchema.parse(
		await Bun.file(
			new URL(`${PATCH}/champions/${MOCKUP_BUILDS[id].championKey}.json`, DATA),
		).json(),
	)
	return {
		patch: PATCH,
		champion,
		itemsById: Object.fromEntries(items.map((item) => [item.id, item])),
		runes,
	}
}

function sum(parts: readonly { value: number }[]) {
	return parts.reduce((total, { value }) => total + value, 0)
}

describe("mockupStats", () => {
	test.each([
		["jinx", undefined],
		["jinx", "rockets"],
		["lux", undefined],
		["garen", undefined],
	] as const)(
		"%s (%s): every stat's parts add up to its total",
		async (id, form) => {
			const result = mockupStats(MOCKUP_BUILDS[id], await gameData(id), {
				form,
				preview: true,
			})
			for (const stat of Object.keys(result.stats) as StatName[]) {
				expect(sum(result.composition[stat])).toBeCloseTo(
					result.stats[stat].total,
				)
				expect(sum(result.preview?.composition[stat] ?? [])).toBeCloseTo(
					result.preview?.stats[stat].total ?? 0,
				)
			}
		},
	)

	test("Lux's ability power credits Magical Opus with 30% of her flat ability power", async () => {
		const { composition } = mockupStats(
			MOCKUP_BUILDS.lux,
			await gameData("lux"),
		)
		const flat = sum(
			composition.abilityPower.filter(({ kind }) => kind !== "effect"),
		)
		const effects = composition.abilityPower.filter(
			({ kind }) => kind === "effect",
		)

		expect(effects).toHaveLength(1)
		expect(effects[0]?.value).toBeCloseTo(0.3 * flat)
	})

	test("Jinx in Minigun compares with Rockets, which keep less attack speed", async () => {
		const { stats, compared } = mockupStats(
			MOCKUP_BUILDS.jinx,
			await gameData("jinx"),
		)

		expect(compared?.comparedName).toBe("Rockets")
		expect(stats.attackSpeed.total).toBeGreaterThan(
			compared?.stats.attackSpeed.total ?? Number.POSITIVE_INFINITY,
		)
	})
})
