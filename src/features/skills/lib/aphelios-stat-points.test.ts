import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { simulateCombat } from "@/lib/combat/simulate-combat"
import { combatEffects } from "@/lib/effects/available-effects"
import { computeBuildStats } from "@/lib/stats/compute-build-stats"
import { abilityRanksAt } from "./ability-ranks"
import { skillChampion } from "./skill-champions.fixtures"
import { parseOrder, ranksOf } from "./skill-order"
import { skillRulesOf } from "./skill-rules"

// Real current-patch data (public/data); the expected numbers are the wiki's (The Hitman and the Seer).
const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()
const aphelios: Champion = championSchema.parse(
	await Bun.file(new URL(`${PATCH}/champions/Aphelios.json`, DATA)).json(),
)
const rules = skillRulesOf(aphelios)

/** Aphelios's build at `level` with the `skills` link value, its ranks split as the composer does. */
function build(level: number, skills: string) {
	const pointRanks = ranksOf(parseOrder(skills, rules), rules)
	const ranks = abilityRanksAt(rules, { level, pointRanks })
	return {
		champion: aphelios,
		patch: PATCH,
		level,
		items: [],
		shards: [],
		ranks,
		statRanks: pointRanks,
	}
}

describe("Aphelios's stat points", () => {
	test.each([
		// level, points, bonus AD, bonus attack speed, lethality
		[3, "QWE", 4, 0.09, 4.5],
		[9, "QQQEQEQEQ", 24, 0, 13.5],
		[18, "QWEQWEQWEQWEQWEQWE", 24, 0.54, 27],
	])(
		"level %i, %s: +%d AD, +%d attack speed, %d lethality",
		(level, skills, ad, as, lethality) => {
			const stats = computeBuildStats(build(level, skills))
			const bare = computeBuildStats(build(level, ""))

			expect(stats.attackDamage.bonus - bare.attackDamage.bonus).toBeCloseTo(ad)
			expect(stats.attackSpeed.total - bare.attackSpeed.total).toBeCloseTo(
				aphelios.stats.attackSpeed.ratio * as,
			)
			expect(stats.lethality.total).toBeCloseTo(lethality)
		},
	)

	test("unspent points add nothing, though his abilities have ranks", () => {
		const none = computeBuildStats(build(18, ""))

		expect(none.attackDamage.bonus).toBe(0)
		expect(none.lethality.total).toBe(0)
	})
})

describe("Aphelios's abilities rank up by level", () => {
	test.each([
		[1, { Q: 0, W: 1, E: 0, R: 0 }],
		[2, { Q: 1, W: 1, E: 0, R: 0 }],
		[5, { Q: 1, W: 1, E: 0, R: 0 }],
		[6, { Q: 1, W: 1, E: 0, R: 1 }],
		[11, { Q: 1, W: 1, E: 0, R: 2 }],
		[16, { Q: 1, W: 1, E: 0, R: 3 }],
	])("level %i", (level, ranks) => {
		expect(build(level, "QQQEQ").ranks).toEqual(ranks)
	})

	test("for any other champion, the abilities' ranks are the points'", () => {
		const pointRanks = { Q: 2, W: 1, E: 0, R: 1 }
		expect(
			abilityRanksAt(skillRulesOf(skillChampion()), { level: 6, pointRanks }),
		).toBe(pointRanks)
	})

	test("whatever the points: they never reach the abilities", () => {
		expect(build(9, "QQQEQEQEQ").ranks).toEqual(build(9, "WWWEWEWEW").ranks)
	})
})

describe("Aphelios's combo", () => {
	function castR(level: number, skills: string) {
		const combatBuild = build(level, skills)
		return simulateCombat({
			build: combatBuild,
			effects: combatEffects({
				patch: PATCH,
				champion: aphelios,
				ranks: combatBuild.ranks,
				spells: [],
				runes: [],
				items: [],
			}),
			summoners: [],
			target: { health: 3000, armor: 0, magicResist: 0, level },
			actions: [{ kind: "ability", slot: "R" }],
		})
	}

	test("casts Moonlight Vigil from level 6, not before", () => {
		expect(castR(5, "QWEQW").steps[0]?.refused).toBeDefined()
		expect(castR(6, "QWEQWE").steps[0]?.refused).toBeUndefined()
	})

	test("its damage reads the rank the level gives and the AD the points buy", () => {
		// 125 / 175 / 225 (+ 20% bonus AD): level 11 is rank 2; 6 points in Q are 24 bonus AD.
		const result = castR(11, "QQQEQEQEQWW")
		expect(result.total.raw).toBeCloseTo(175 + 0.2 * 24)
	})
})
