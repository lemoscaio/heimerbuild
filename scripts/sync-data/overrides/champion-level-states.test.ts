import { describe, expect, test } from "bun:test"
import { championSchema } from "../schemas/champion"
import { CHAMPION_LEVEL_STATES } from "./champion-level-states"

const levelStatesSchema = championSchema.shape.levelStates

describe("CHAMPION_LEVEL_STATES", () => {
	test.each(
		CHAMPION_LEVEL_STATES.map((override) => [override.id, override] as const),
	)("%s matches the champion schema", (_, override) => {
		expect(levelStatesSchema.safeParse(override.apply(undefined)).success).toBe(
			true,
		)
	})

	test("the schema rejects level states out of order", () => {
		const result = levelStatesSchema.safeParse([
			{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
			{ fromLevel: 6, attackRange: { base: 525, perLevel: 0 } },
		])

		expect(result.success).toBe(false)
	})
})
