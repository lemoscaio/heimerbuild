import { describe, expect, test } from "bun:test"
import type { ChampionForm } from "@schemas/champion"
import { formLocks } from "./form-locks"

const forms: ChampionForm[] = [
	{ id: "minigun", name: "Minigun", gameName: "Pow-Pow" },
	{ id: "rockets", name: "Rockets", requires: { slot: "Q", minRank: 1 } },
	{ id: "mega", name: "Mega", requires: { slot: "R", minRank: 2 } },
]
const ranks = (Q: number, R: number) => ({ Q, W: 0, E: 0, R })

describe("formLocks", () => {
	test("says what each locked form needs", () => {
		expect(formLocks(forms, ranks(0, 1))).toEqual({
			rockets: "Learn Q to unlock Rockets",
			mega: "Rank R to 2 to unlock Mega",
		})
	})

	test("drops a form once its rank is reached", () => {
		expect(formLocks(forms, ranks(1, 2))).toEqual({})
	})

	test("locks nothing while the ranks load, or for a champion without forms", () => {
		expect(formLocks(forms, undefined)).toEqual({})
		expect(formLocks(undefined, ranks(0, 0))).toEqual({})
	})
})
