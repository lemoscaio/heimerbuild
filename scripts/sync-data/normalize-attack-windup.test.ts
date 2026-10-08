import { describe, expect, test } from "bun:test"
import { normalizeAttackWindup } from "./normalize-attack-windup"

// Values from the CommunityDragon 16.19 character bins; the percents are the wiki's.
describe("normalizeAttackWindup", () => {
	test("an older champion's windup is 30% plus its offset, with its modifier (Garen: 18%, 0.5)", () => {
		expect(
			normalizeAttackWindup({
				mAttackDelayCastOffsetPercent: -0.11999999731779099,
				mAttackDelayCastOffsetPercentAttackSpeedRatio: 0.5,
			}),
		).toEqual({ percent: 0.18, modifier: 0.5 })
	})

	test("a newer champion's windup is its cast time over its total time (Aatrox: 0.3 / 1.52 s)", () => {
		expect(
			normalizeAttackWindup({
				mAttackCastTime: 0.30000001192092896,
				mAttackTotalTime: 1.5199999809265137,
			}),
		).toEqual({ percent: 0.1974, modifier: 1 })
	})

	test("the cast time wins over an offset the attack also sets (Bard: 18.75%)", () => {
		expect(
			normalizeAttackWindup({
				mAttackDelayCastOffsetPercent: -0.10000000149011612,
				mAttackCastTime: 0.30000001192092896,
				mAttackTotalTime: 1.600000023841858,
			}).percent,
		).toBe(0.1875)
	})

	test("an attack that sets no field has the default 30% (Alistar)", () => {
		expect(normalizeAttackWindup({})).toEqual({ percent: 0.3, modifier: 1 })
		expect(normalizeAttackWindup(undefined)).toEqual({
			percent: 0.3,
			modifier: 1,
		})
	})

	test("fails on a cast time without a total time", () => {
		expect(() => normalizeAttackWindup({ mAttackCastTime: 0.25 })).toThrow(
			"only one of",
		)
	})
})
