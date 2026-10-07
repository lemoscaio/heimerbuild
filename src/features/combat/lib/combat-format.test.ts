import { describe, expect, test } from "bun:test"
import {
	actionLabel,
	formatDamage,
	formatPartPercent,
	formatSeconds,
	formatShare,
} from "./combat-format"

const NAMES = {
	ability: (slot: string) => (slot === "E" ? "Vault" : slot),
	summoner: (slot: number) => (slot === 1 ? "Ignite" : "Flash"),
}

describe("combat formats", () => {
	test("rounds damage and shares, and keeps two decimals of seconds", () => {
		expect(formatDamage(1142.6)).toBe("1,143")
		expect(formatShare(0.3649)).toBe("36%")
		expect(formatSeconds(0.8695)).toBe("0.87 s")
	})

	test("shows a part's whole percent, and a part that rounds to nothing as under 1%", () => {
		expect(formatPartPercent(62)).toBe("62%")
		expect(formatPartPercent(0)).toBe("<1%")
	})

	test("names each kind of action", () => {
		expect(actionLabel({ kind: "attack" }, NAMES)).toBe("Attack")
		expect(actionLabel({ kind: "ability", slot: "E" }, NAMES)).toBe("E · Vault")
		expect(actionLabel({ kind: "summoner", slot: 1 }, NAMES)).toBe("Ignite")
		expect(actionLabel({ kind: "wait", seconds: 1 }, NAMES)).toBe("Wait")
	})
})
