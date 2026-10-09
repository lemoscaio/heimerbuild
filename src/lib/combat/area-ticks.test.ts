import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { combatEffects } from "../effects/available-effects"
import { areaTicks } from "./area-ticks"
import { ticksInArea } from "./damage-over-time"
import { abilityTimeInArea, areaSeconds } from "./registries/ability-hits"

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

describe("areaTicks: the ticks a time in the area deals on the cast's own damage over time", async () => {
	async function ticksFor(key: string, slot: "Q" | "W", seconds: number) {
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
		const range = abilityTimeInArea({ championKey: key, patch: PATCH, slot })
		return areaTicks(seconds, range ?? {}, {
			slot,
			effects,
			context: { level: 9, ranks },
		})
	}

	test("Morgana's W: 1 / 3 / 5 s in the pool are 3 / 7 / 10 ticks", async () => {
		expect(await ticksFor("Morgana", "W", 1)).toBe(3)
		expect(await ticksFor("Morgana", "W", 3)).toBe(7)
		expect(await ticksFor("Morgana", "W", 5)).toBe(10)
	})

	test("Singed's Q counts the 2 s poison after the trail: 0 / 2 / 4 s are 8 / 16 / 24 ticks", async () => {
		expect(await ticksFor("Singed", "Q", 0)).toBe(8)
		expect(await ticksFor("Singed", "Q", 2)).toBe(16)
		expect(await ticksFor("Singed", "Q", 4)).toBe(24)
	})

	test("Darius's Q has no damage over time of its own: no ticks", async () => {
		expect(await ticksFor("Darius", "Q", 1)).toBeUndefined()
	})
})

describe("areaSeconds: a step's time, on its range's steps and within it", () => {
	const judgment = { min: 1, max: 3, step: 0.25 }

	test("no time is the full one", () => {
		expect(areaSeconds(judgment, undefined)).toBe(3)
	})

	test("a time out of the range is its nearest end, one off a step the nearest step", () => {
		expect(areaSeconds(judgment, 0.2)).toBe(1)
		expect(areaSeconds(judgment, 9)).toBe(3)
		expect(areaSeconds(judgment, 1.6)).toBe(1.5)
		expect(areaSeconds({ min: 0.5, max: 15, step: 0.5 }, 3.3)).toBe(3.5)
	})
})
