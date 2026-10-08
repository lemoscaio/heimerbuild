import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import type {
	CombatItem,
	CombatResult,
	CombatStep,
	CombatTarget,
} from "@/lib/combat/combat"
import { simulateCombat } from "@/lib/combat/simulate-combat"
import { combatEffects } from "@/lib/effects/available-effects"
import { combatRows, damageParts, stepTimings, timedHits } from "./combat-rows"
import { combatNames, stepView } from "./combat-view"

// Real current-patch data (public/data), as the Combo tab runs it.
const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

const DUMMY: CombatTarget = {
	health: 1800,
	armor: 60,
	magicResist: 45,
	level: 9,
}

const JAX = await champion("Jax")
// Level 9 with E Q W W W R W Q W.
const RANKS = { Q: 2, W: 5, E: 1, R: 1 }

function simulate(actions: readonly CombatItem[]): CombatResult {
	return simulateCombat({
		build: {
			champion: JAX,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks: RANKS,
		},
		effects: combatEffects({
			patch: PATCH,
			champion: JAX,
			ranks: RANKS,
			spells: [],
			runes: [],
			items: [],
		}),
		summoners: [],
		target: DUMMY,
		actions,
	})
}

const ATTACK = { kind: "attack" } as const
const cast = (slot: "Q" | "W" | "E" | "R") =>
	({ kind: "ability", slot }) as const

// Counter Strike first: its strike lands 1 s later, while the attacks run.
const COMBO = simulate([
	cast("E"),
	cast("Q"),
	cast("W"),
	ATTACK,
	ATTACK,
	ATTACK,
])

function counterStrike(result: CombatResult) {
	return timedHits(result, DUMMY).filter(
		({ source }) => source.kind === "effect" && source.effectId === "jax-e",
	)
}

describe("timedHits", () => {
	test("every hit in time order, the target's health going down to what the totals leave", () => {
		const hits = timedHits(COMBO, DUMMY)
		const times = hits.map(({ time }) => time)

		expect(times).toEqual(times.toSorted((a, b) => a - b))
		expect(hits.at(-1)?.dealt).toBeCloseTo(COMBO.total.final)
		expect(hits.at(-1)?.targetHealth).toBeCloseTo(
			DUMMY.health - COMBO.total.final,
		)
	})

	test("Counter Strike's strike belongs to E's step, at 1 s", () => {
		const strikes = counterStrike(COMBO)

		expect(strikes.map(({ step, time }) => ({ step, time }))).toEqual([
			{ step: 0, time: 1 },
			{ step: 0, time: 1 },
		])
	})
})

describe("stepTimings", () => {
	test("E starts at 0 and lands at 1 s, after the next steps started", () => {
		const [e, q] = stepTimings(COMBO, timedHits(COMBO, DUMMY))

		expect(e).toEqual({
			index: 0,
			startsAt: 0,
			lands: { first: 1, last: 1 },
			late: true,
		})
		expect(q?.late).toBe(false)
	})

	test("an attack lands at the end of its windup", () => {
		const timings = stepTimings(COMBO, timedHits(COMBO, DUMMY))
		const attack = timings[3]

		expect(attack?.lands?.first).toBeGreaterThan(attack?.startsAt ?? 0)
		expect(attack?.late).toBe(false)
	})

	test("a step that deals nothing has no landing", () => {
		const result = simulate([{ kind: "wait", seconds: 1 }, ATTACK])
		const [wait] = stepTimings(result, timedHits(result, DUMMY))

		expect(wait?.lands).toBeUndefined()
		expect(wait?.late).toBe(false)
	})
})

describe("combatRows", () => {
	test("in hit order: E's row comes once its strike lands, after the steps that hit before it", () => {
		const rows = combatRows(COMBO, { target: DUMMY, order: "hit" })
		const firsts = rows.map((row) => row.lands?.first ?? row.startsAt)

		expect(rows.map(({ index }) => index)).toEqual([1, 2, 0, 3, 4, 5])
		expect(firsts).toEqual(firsts.toSorted((a, b) => a - b))
	})

	test("E's row has its strike's damage, which the row running when it landed leaves out", () => {
		const rows = combatRows(COMBO, { target: DUMMY, order: "step" })
		const strike = counterStrike(COMBO).reduce(
			(sum, { damage }) => sum + (damage?.final ?? 0),
			0,
		)
		const [eRow] = rows
		// The step running at 1 s holds the strike among its events, which its card shows.
		const holder = COMBO.steps.findIndex(({ events }) =>
			events.some((event) => event.kind === "hit" && event.delayed),
		)

		expect(holder).toBeGreaterThan(0)
		expect(eRow?.damage).toBeCloseTo(strike)
		expect(eRow?.step.events).toContainEqual(
			expect.objectContaining({ delayed: { owner: 0 } }),
		)
		expect(
			rows
				.slice(1)
				.flatMap(({ step }) => step.events)
				.filter((event) => event.kind === "hit" && event.delayed),
		).toEqual([])
	})

	test("the running total goes down the rows as shown and ends at the combo's damage", () => {
		for (const order of ["hit", "step"] as const) {
			const rows = combatRows(COMBO, { target: DUMMY, order })
			let dealt = 0
			for (const row of rows) {
				dealt += row.damage
				expect(row.dealt).toBeCloseTo(dealt)
				expect(row.targetHealth).toBeCloseTo(DUMMY.health - dealt)
				expect(row.step.targetHealth).toBe(row.targetHealth)
			}
			expect(rows.at(-1)?.dealt).toBeCloseTo(COMBO.total.final)
		}
	})

	test("a marker is a row at its time, with no damage", () => {
		const result = simulate([
			cast("Q"),
			{ kind: "situation", effectId: "jax-passive" },
			ATTACK,
		])
		const rows = combatRows(result, { target: DUMMY, order: "hit" })

		expect(rows.map(({ index }) => index)).toEqual([0, 1, 2])
		expect(rows[1]?.damage).toBe(0)
		expect(rows[1]?.lands).toBeUndefined()
	})
})

describe("damageParts", () => {
	const names = combatNames({ passiveName: "", spells: [], effects: [] })
	const viewOf = (step: CombatStep | undefined) =>
		stepView(step as CombatStep, { names, target: DUMMY })

	test("Empower: the attack's damage and its bonus", () => {
		const [, , empower] = COMBO.steps
		const view = viewOf(empower)
		const parts = damageParts(view)

		expect(parts).toHaveLength(2)
		expect(parts.reduce((sum, part) => sum + part, 0)).toBeCloseTo(
			view.total.final,
		)
	})

	test("one hit has no parts: the strike landing then is E's", () => {
		const rows = combatRows(COMBO, { target: DUMMY, order: "step" })

		expect(damageParts(viewOf(rows[3]?.step))).toEqual([])
	})
})
