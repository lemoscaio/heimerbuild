import { describe, expect, test } from "bun:test"
import { championSchema } from "../schemas/champion"
import { CHAMPION_FORMS } from "./champion-forms"

const formsSchema = championSchema.shape.forms

describe("CHAMPION_FORMS", () => {
	test.each(CHAMPION_FORMS.map((override) => [override.id, override] as const))(
		"%s matches the champion schema",
		(_, override) => {
			expect(formsSchema.safeParse(override.apply(undefined)).success).toBe(
				true,
			)
		},
	)

	test("the schema rejects a single form", () => {
		expect(formsSchema.safeParse([{ id: "mini", name: "Mini" }]).success).toBe(
			false,
		)
	})

	test("the schema rejects duplicate form ids", () => {
		const result = formsSchema.safeParse([
			{ id: "human", name: "Human" },
			{ id: "human", name: "Cougar", attackType: "melee" },
		])

		expect(result.success).toBe(false)
	})

	test("the schema rejects a default form that changes the champion", () => {
		const result = formsSchema.safeParse([
			{ id: "mini", name: "Mini Gnar", attackType: "ranged" },
			{ id: "mega", name: "Mega Gnar", attackType: "melee" },
		])

		expect(result.success).toBe(false)
	})

	test("the default form may carry the game's name, never a requirement", () => {
		const minigun = { id: "minigun", name: "Minigun", gameName: "Pow-Pow" }
		const rockets = {
			id: "rockets",
			name: "Rockets",
			requires: { slot: "Q", minRank: 1 },
		}

		expect(formsSchema.safeParse([minigun, rockets]).success).toBe(true)
		expect(formsSchema.safeParse([rockets, minigun]).success).toBe(false)
	})

	test("the schema rejects a form id the share link cannot carry", () => {
		const result = formsSchema.safeParse([
			{ id: "mini", name: "Mini Gnar" },
			{ id: "Mega Gnar", name: "Mega Gnar" },
		])

		expect(result.success).toBe(false)
	})
})
