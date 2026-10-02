import { describe, expect, test } from "bun:test"
import {
	EMPTY_SUMMONER_SLOTS,
	parseSummonerSlots,
	serializeSummonerSlots,
} from "./summoner-slots"

describe("serializeSummonerSlots", () => {
	test("writes both slots in order, D first", () => {
		expect(serializeSummonerSlots(["4", "14"])).toBe("4,14")
		expect(serializeSummonerSlots(["14", "4"])).toBe("14,4")
	})

	test("leaves an empty slot blank but keeps the comma, so the slot stays in place", () => {
		expect(serializeSummonerSlots(["4", undefined])).toBe("4,")
		expect(serializeSummonerSlots([undefined, "4"])).toBe(",4")
	})

	test("leaves two empty slots out of the URL", () => {
		expect(serializeSummonerSlots(EMPTY_SUMMONER_SLOTS)).toBeUndefined()
	})
})

describe("parseSummonerSlots", () => {
	test("reads back every written form", () => {
		for (const slots of [
			["4", "14"],
			["4", undefined],
			[undefined, "4"],
		] as const) {
			expect(parseSummonerSlots(serializeSummonerSlots(slots))).toEqual(slots)
		}
	})

	test("reads a missing or malformed value as two empty slots", () => {
		for (const value of [undefined, "", "4", "4,14,6", "flash,ignite"]) {
			expect(parseSummonerSlots(value)).toEqual(EMPTY_SUMMONER_SLOTS)
		}
	})
})
