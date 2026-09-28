import { describe, expect, test } from "bun:test"
import { GameDataUnavailableError } from "../services/game-data"
import { gameDataQueries } from "./game-data-queries"

describe("gameDataQueries", () => {
	test("keys every patch file by its patch, so a new patch never reuses cached data", () => {
		const keys = [
			gameDataQueries.champions("16.19.1").queryKey,
			gameDataQueries.champion("16.19.1", "Ahri").queryKey,
			gameDataQueries.items("16.19.1").queryKey,
		]
		for (const key of keys) {
			expect(key).toContain("16.19.1")
			expect(key.slice(0, 2)).toEqual([...gameDataQueries.patch("16.19.1")])
		}
		expect(gameDataQueries.items("16.20.1").queryKey).not.toEqual(
			gameDataQueries.items("16.19.1").queryKey,
		)
	})

	test("does not retry a missing file but retries other failures up to 3 times", () => {
		const { retry } = gameDataQueries.items("16.19.1")
		if (typeof retry !== "function") {
			throw new Error("expected a retry function")
		}
		const missing = new GameDataUnavailableError("/data/x.json", "HTTP 404")
		const network = new TypeError("Failed to fetch")
		expect(retry(0, missing)).toBe(false)
		expect(retry(0, network)).toBe(true)
		expect(retry(2, network)).toBe(true)
		expect(retry(3, network)).toBe(false)
	})
})
