import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import { combatEffects } from "../effects/available-effects"
import { effectiveItems } from "../item-upgrades"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatTarget,
} from "./combat"
import { type CombatInput, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); Shock's numbers are the wiki's (Muramana, 2026-10-09, issue 436).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

const { items } = ItemsFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
)
const itemsById = Object.fromEntries(items.map((item) => [item.id, item]))
const RUNES = runesFileSchema
	.parse(await Bun.file(new URL(`${PATCH}/runes.json`, DATA)).json())
	.trees.flatMap((tree) => [tree.keystones, ...tree.rows].flat())

// No resistances: every hit's final damage is its raw damage.
const TARGET: CombatTarget = {
	health: 5000,
	armor: 0,
	magicResist: 0,
	level: 9,
}

const SHOCK_ATTACK = "muramana-shock-attack"
const SHOCK_ABILITY = "muramana-shock-ability"
const ONE_EACH: AbilityRanks = { Q: 1, W: 1, E: 1, R: 1 }

type SetupOptions = { runes?: readonly Rune[] }

/** The champion at level 6 with Manamune at `mana` Manaflow, as the build gives it to the combo. */
function setup(
	championData: Champion,
	mana: number,
	{ runes = [] }: SetupOptions = {},
) {
	const ranks = ONE_EACH
	const matchStacks = { "manaflow-mana": mana }
	const held = effectiveItems(
		[itemsById["3004"]],
		matchStacks,
		itemsById,
		championData,
	)
	const build = {
		champion: championData,
		patch: PATCH,
		level: 6,
		items: held,
		shards: [],
		ranks,
		matchStacks,
	}
	const effects = combatEffects({
		patch: PATCH,
		champion: championData,
		ranks,
		spells: [],
		runes,
		items: held,
	})
	return { build, effects }
}

function simulate(
	championData: Champion,
	mana: number,
	actions: readonly CombatAction[],
	options: SetupOptions = {},
) {
	const input: CombatInput = {
		...setup(championData, mana, options),
		summoners: [],
		target: TARGET,
		actions,
	}
	return simulateCombat(input)
}

/** Maximum mana with the build at rest: Shock reads it. */
function maxMana(championData: Champion, mana: number) {
	const { build } = setup(championData, mana)
	return computeBuildStats(build).mana.total
}

type DamageHit = Extract<CombatEvent, { kind: "hit"; damage: unknown }>

function shocks(result: CombatResult, step: number, effectId: string) {
	return result.steps[step].events.filter(
		(event): event is DamageHit =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "effect" &&
			event.source.effectId === effectId,
	)
}

const ezreal = await champion("Ezreal")
const COMBO: CombatAction[] = [
	{ kind: "ability", slot: "Q" },
	{ kind: "ability", slot: "W" },
	{ kind: "ability", slot: "E" },
	{ kind: "ability", slot: "R" },
	{ kind: "attack" },
]

describe("Muramana's Shock (wiki)", () => {
	const result = simulate(ezreal, 360, COMBO)
	const mana = maxMana(ezreal, 360)

	test("Ezreal's mana is Muramana's: 1000 on his own, no Manaflow on top", () => {
		expect(mana).toBe(
			computeBuildStats({ ...setup(ezreal, 0).build, items: [] }).mana.total +
				1000,
		)
	})

	test("a ranged champion's ability deals 3% of maximum mana, physical, once per cast", () => {
		for (const step of [0, 3]) {
			const [shock, ...others] = shocks(result, step, SHOCK_ABILITY)
			expect(others).toEqual([])
			expect(shock?.damage.type).toBe("physical")
			expect(shock?.damage.raw).toBeCloseTo(0.03 * mana)
		}
	})

	test("Mystic Shot applies on-hit but triggers Shock once, as an ability", () => {
		expect(shocks(result, 0, SHOCK_ATTACK)).toEqual([])
	})

	test("Essence Flux deals nothing on its cast; its detonation on E is a cast instance of its own", () => {
		expect(shocks(result, 1, SHOCK_ABILITY)).toEqual([])
		expect(shocks(result, 2, SHOCK_ABILITY)).toHaveLength(2)
	})

	test("a basic attack deals 1.2% of maximum mana on-hit", () => {
		const [shock, ...others] = shocks(result, 4, SHOCK_ATTACK)

		expect(others).toEqual([])
		expect(shock?.damage.raw).toBeCloseTo(0.012 * mana)
		expect(shocks(result, 4, SHOCK_ABILITY)).toEqual([])
	})

	test("at 359 Manaflow it is still Manamune: no Shock", () => {
		const below = simulate(ezreal, 359, COMBO)

		for (const step of [0, 1, 2, 3, 4]) {
			expect(shocks(below, step, SHOCK_ABILITY)).toEqual([])
			expect(shocks(below, step, SHOCK_ATTACK)).toEqual([])
		}
	})
})

describe("Shock's 6.5 s per cast instance (wiki)", async () => {
	const nasus = await champion("Nasus")

	test("Fury of the Sands' 15 s burn is one cast: Shock at its first tick, then every 6.5 s", () => {
		const result = simulate(nasus, 360, [
			{ kind: "ability", slot: "R", inArea: 15 },
		])
		const times = shocks(result, 0, SHOCK_ABILITY).map(({ time }) => time)
		const mana = maxMana(nasus, 360)

		expect(times).toHaveLength(3)
		expect(times[1] - times[0]).toBeGreaterThanOrEqual(6.5 - 1e-9)
		expect(times[2] - times[1]).toBeGreaterThanOrEqual(6.5 - 1e-9)
		// Melee: 4% of maximum mana.
		expect(shocks(result, 0, SHOCK_ABILITY)[0]?.damage.raw).toBeCloseTo(
			0.04 * mana,
		)
	})
})

// Wiki Muramana, checked 2026-10-10: an ability that triggers on-hit and spell effects "in the same
// damage instance" applies Shock as an ability; "in a separate damage instance", as both.
describe("Shock on empowered attacks, per ability (wiki)", async () => {
	const ATTACK: CombatAction = { kind: "attack" }
	const ability = (slot: "Q" | "W" | "E" | "R"): CombatAction => ({
		kind: "ability",
		slot,
	})
	const darius = await champion("Darius")
	// Garen and Rengar have no mana, so no Shock (issue 441); as mana users they still test the ability's rule.
	async function asManaUser(key: string) {
		return { ...(await champion(key)), resource: "MANA" }
	}

	/** Each Shock part the step dealt, by part. */
	function parts(result: CombatResult, step: number) {
		return {
			attack: shocks(result, step, SHOCK_ATTACK).length,
			ability: shocks(result, step, SHOCK_ABILITY).length,
		}
	}

	test("Crippling Strike is spell damage itself: one Shock, the ability part, and the hand-counted total", () => {
		const result = simulate(darius, 360, [ability("W")])
		const mana = maxMana(darius, 360)
		// Muramana's Awe: 2% of maximum mana as AD; Crippling Strike rank 1 is the attack's 140% AD.
		const attackDamage =
			computeBuildStats(setup(darius, 360).build).attackDamage.total +
			0.02 * mana
		const dealt = result.steps[0].events.filter(
			(event): event is DamageHit =>
				event.kind === "hit" &&
				"damage" in event &&
				!(
					event.source.kind === "effect" &&
					event.source.effectId === "darius-hemorrhage"
				),
		)

		expect(parts(result, 0)).toEqual({ attack: 0, ability: 1 })
		expect(shocks(result, 0, SHOCK_ABILITY)[0]?.damage.raw).toBeCloseTo(
			0.04 * mana,
		)
		expect(
			dealt.reduce((sum, { damage }) => sum + damage.final, 0),
		).toBeCloseTo(1.4 * attackDamage + 0.04 * mana)
	})

	test("Siphoning Strike and Tumble are spell damage themselves too: the ability part only", async () => {
		for (const [key, slot] of [
			["Nasus", "Q"],
			["Vayne", "Q"],
		] as const) {
			const result = simulate(await champion(key), 360, [ability(slot)])

			expect(parts(result, 0)).toEqual({ attack: 0, ability: 1 })
		}
	})

	test("Empower, Decisive Strike and Shield of Daybreak are a spell instance apart from the attack: both parts", async () => {
		for (const [key, slot] of [
			["Jax", "W"],
			["Garen", "Q"],
			["Leona", "Q"],
		] as const) {
			const result = simulate(await asManaUser(key), 360, [ability(slot)])

			expect(parts(result, 0)).toEqual({ attack: 1, ability: 1 })
		}
	})

	test("Savagery's bonus is proc damage: the attack part only", async () => {
		const result = simulate(await asManaUser("Rengar"), 360, [ability("Q")])

		expect(parts(result, 0)).toEqual({ attack: 1, ability: 0 })
	})

	test("Thrill of the Hunt's leap bonus is proc damage too: the attack part only", async () => {
		const result = simulate(await asManaUser("Rengar"), 360, [
			ability("R"),
			ATTACK,
		])

		expect(parts(result, 1)).toEqual({ attack: 1, ability: 0 })
	})

	test("Crippling Strike still counts as a basic attack for Press the Attack: W, AA, AA strikes on the third", () => {
		const pressTheAttack = RUNES.find(({ key }) => key === "PressTheAttack")
		if (!pressTheAttack) throw new Error("no Press the Attack this patch")
		const result = simulate(darius, 360, [ability("W"), ATTACK, ATTACK], {
			runes: [pressTheAttack],
		})

		expect(shocks(result, 2, "press-the-attack")).toHaveLength(1)
	})
})

// Wiki: "Manaless champions cannot trigger Manaflow", and Shock and Awe scale with mana (issue 441).
describe("Manamune at 360 on a champion without mana", async () => {
	const garen = await champion("Garen")
	const zed = await champion("Zed")

	test("Garen's Manamune stays Manamune at 360: Decisive Strike deals no Shock and runs no Awe", () => {
		const { build, effects } = setup(garen, 360)

		expect(build.items.map(({ name }) => name)).toEqual(["Manamune"])
		const result = simulate(garen, 360, [{ kind: "ability", slot: "Q" }])
		const [step] = result.steps

		expect(effects.map(({ id }) => id)).not.toContain("muramana-awe")
		expect(shocks(result, 0, SHOCK_ATTACK)).toEqual([])
		expect(shocks(result, 0, SHOCK_ABILITY)).toEqual([])
		expect(step?.active.map(({ effectId }) => effectId)).not.toContain(
			"muramana-awe",
		)
	})

	test("Zed's energy is not mana: no Shock on his attack, and Manamune adds only its own attack damage", () => {
		const result = simulate(zed, 360, [{ kind: "attack" }])
		const { build, effects } = setup(zed, 360)
		const stats = computeBuildStats({
			...build,
			effects: { available: effects, overrides: {} },
		})

		expect(shocks(result, 0, SHOCK_ATTACK)).toEqual([])
		expect(stats.attackDamage.bonus).toBe(35)
	})
})
