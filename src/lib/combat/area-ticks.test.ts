import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { combatEffects } from "../effects/available-effects"
import { areaVariants } from "./area-ticks"
import { ticksInArea } from "./damage-over-time"
import { abilityVariants } from "./registries/ability-hits"

// Real current-patch data (public/data).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

describe("ticksInArea: every tick up to the time in the area, no more than the effect deals", () => {
	const fromCast = { every: 0.5 }
	const delayed = { every: 0.25, firstTick: "delayed" } as const

	test("a first tick on the cast takes the one at the end: 1 s every 0.5 s is 3", () => {
		expect(ticksInArea(1, 5, fromCast)).toBe(3)
		expect(ticksInArea(3, 5, fromCast)).toBe(7)
	})

	test("capped at what the effect deals on its own: a 5 s pool is 10, not 11", () => {
		expect(ticksInArea(5, 5, fromCast)).toBe(10)
	})

	test("a delayed first tick: 4 a second, the last at the end, past the effect's own duration when longer", () => {
		expect(ticksInArea(2, 2, delayed)).toBe(8)
		expect(ticksInArea(4, 2, delayed)).toBe(16)
		expect(ticksInArea(6, 2, delayed)).toBe(24)
	})

	test("too short for a delayed tick: none", () => {
		expect(ticksInArea(0.1, 2, delayed)).toBe(0)
	})
})

describe("areaVariants: each variant's ticks on the cast's own damage over time", async () => {
	async function ticksOf(key: string, slot: "Q" | "W") {
		const ranks = { Q: 1, W: 1, E: 1, R: 1 }
		const build = await champion(key)
		const effects = combatEffects({
			patch: PATCH,
			champion: build,
			ranks,
			spells: [],
			runes: [],
			items: [],
		})
		return areaVariants(
			abilityVariants({ championKey: key, patch: PATCH, slot }),
			{ slot, effects, context: { level: 9, ranks } },
		).map(({ label, ticks }) => [label, ticks])
	}

	test("Morgana's W: 1 / 3 / 5 s in the pool are 3 / 7 / 10 ticks", async () => {
		expect(await ticksOf("Morgana", "W")).toEqual([
			["1 s", 3],
			["3 s", 7],
			["5 s", 10],
		])
	})

	test("Singed's Q: 0 / 2 / 4 s in the trail are 8 / 16 / 24 ticks", async () => {
		expect(await ticksOf("Singed", "Q")).toEqual([
			["0 s", 8],
			["2 s", 16],
			["4 s", 24],
		])
	})

	test("Darius's Q has no time in an area: no ticks", async () => {
		const ticks = (await ticksOf("Darius", "Q")).map(([, count]) => count)

		expect(ticks).toEqual([undefined, undefined])
	})
})
