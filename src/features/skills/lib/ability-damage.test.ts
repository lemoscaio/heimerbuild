import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { availableEffects } from "@/lib/effects/available-effects"
import type { MatchStacks } from "@/lib/effects/match-stacks"
import {
	buildAbilityCounters,
	computeBuildStats,
} from "@/lib/stats/compute-build-stats"
import { abilityDamageAt } from "./ability-damage"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-08).
const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

const RANKS = { Q: 1, W: 1, E: 1, R: 0 }

/** Each ability's damage at level 9, as the Skills tab reads it. */
function damageOf(build: Champion, slot: "Q" | "W", matchStacks?: MatchStacks) {
	const input = {
		champion: build,
		patch: PATCH,
		level: 9,
		items: [],
		shards: [],
		ranks: RANKS,
		effects: {
			available: availableEffects({
				patch: PATCH,
				champion: build,
				ranks: RANKS,
				spells: [],
				runes: [],
			}),
			overrides: {},
		},
		matchStacks,
	}
	const stats = computeBuildStats(input)
	const spell = build.abilities.spells.find((entry) => entry.slot === slot)
	if (!spell) throw new Error(`no ${slot}`)
	return {
		stats,
		damage: abilityDamageAt(spell, RANKS[slot], {
			stats,
			level: 9,
			counters: { [slot]: buildAbilityCounters(input, slot) },
		}),
	}
}

describe("an ability's damage with the build", () => {
	test("Siphoning Strike adds the build's stacks: rank 1 is 30 + AD + stacks (wiki)", async () => {
		const nasus = await champion("Nasus")
		const none = damageOf(nasus, "Q")
		const stacked = damageOf(nasus, "Q", { "siphoning-strike": 250 })

		expect(none.damage).toEqual({
			type: "physical",
			value: 30 + none.stats.attackDamage.total,
		})
		expect(stacked.damage?.value).toBeCloseTo((none.damage?.value ?? 0) + 250)
	})

	test("Veigar's Baleful Strike grows with the AP his stacks give: 50% of 100 AP at rank 1", async () => {
		const veigar = await champion("Veigar")
		const none = damageOf(veigar, "Q")
		const stacked = damageOf(veigar, "Q", { "phenomenal-evil": 100 })

		expect(stacked.stats.abilityPower.total).toBe(
			none.stats.abilityPower.total + 100,
		)
		expect(stacked.damage?.value).toBeCloseTo((none.damage?.value ?? 0) + 50)
	})

	test("has no number before the ability's first point", async () => {
		const nasus = await champion("Nasus")
		const spell = nasus.abilities.spells.find(({ slot }) => slot === "Q")
		const { stats } = damageOf(nasus, "Q")
		if (!spell) throw new Error("no Q")

		expect(abilityDamageAt(spell, 0, { stats, level: 9 })).toBeUndefined()
	})
})
