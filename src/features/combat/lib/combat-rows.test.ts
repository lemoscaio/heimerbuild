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
import {
	combatRows,
	damageParts,
	procRows,
	stepTimings,
	timedHits,
} from "./combat-rows"
import { combatNames, stepView } from "./combat-view"
import { effectsById } from "./hit-placement"

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
const BUILD_EFFECTS = combatEffects({
	patch: PATCH,
	champion: JAX,
	ranks: RANKS,
	spells: [],
	runes: [],
	items: [],
})
const EFFECTS = effectsById(BUILD_EFFECTS)
const OPTIONS = { target: DUMMY, effects: EFFECTS }

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
		effects: BUILD_EFFECTS,
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
	return timedHits(result, OPTIONS).filter(
		({ source }) => source.kind === "effect" && source.effectId === "jax-e",
	)
}

describe("timedHits", () => {
	test("every hit in time order, the target's health going down to what the totals leave", () => {
		const hits = timedHits(COMBO, OPTIONS)
		const times = hits.map(({ time }) => time)

		expect(times).toEqual(times.toSorted((a, b) => a - b))
		expect(hits.at(-1)?.dealt).toBeCloseTo(COMBO.total.final)
		expect(hits.at(-1)?.targetHealth).toBeCloseTo(
			DUMMY.health - COMBO.total.final,
		)
	})

	test("Counter Strike's strike belongs to E's step, at 1 s, as a separate instance", () => {
		const strikes = counterStrike(COMBO)

		expect(
			strikes.map(({ step, time, instance }) => ({ step, time, instance })),
		).toEqual([
			{ step: 0, time: 1, instance: "jax-e" },
			{ step: 0, time: 1, instance: "jax-e" },
		])
	})
})

describe("stepTimings", () => {
	test("E starts at 0 and lands nothing of its own: its strike is a separate instance", () => {
		const [e, q] = stepTimings(COMBO, timedHits(COMBO, OPTIONS))

		expect(e).toEqual({ index: 0, startsAt: 0, late: false })
		expect(q?.late).toBe(false)
	})

	test("an attack lands at the end of its windup", () => {
		const timings = stepTimings(COMBO, timedHits(COMBO, OPTIONS))
		const attack = timings[3]

		expect(attack?.lands?.first).toBeGreaterThan(attack?.startsAt ?? 0)
		expect(attack?.late).toBe(false)
	})

	test("a step that deals nothing has no landing", () => {
		const result = simulate([{ kind: "wait", seconds: 1 }, ATTACK])
		const [wait] = stepTimings(result, timedHits(result, OPTIONS))

		expect(wait?.lands).toBeUndefined()
		expect(wait?.late).toBe(false)
	})
})

describe("combatRows", () => {
	test("in hit order: E, with nothing of its own, sits at its start; the others by their first landing", () => {
		const rows = combatRows(COMBO, { ...OPTIONS, order: "hit" })
		const firsts = rows.map((row) => row.lands?.first ?? row.startsAt)

		expect(rows.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4, 5])
		expect(firsts).toEqual(firsts.toSorted((a, b) => a - b))
	})

	test("E's strike is a mini row under E's row, landing at 1 s after the next steps started", () => {
		const rows = combatRows(COMBO, { ...OPTIONS, order: "step" })
		const strike = counterStrike(COMBO).reduce(
			(sum, { damage }) => sum + (damage?.final ?? 0),
			0,
		)
		const [eRow] = rows

		expect(eRow?.damage).toBe(0)
		expect(eRow?.procs).toEqual([
			expect.objectContaining({
				effectId: "jax-e",
				time: 1,
				late: true,
				damage: expect.closeTo(strike),
			}),
		])
		expect(rows.slice(1).flatMap(({ procs }) => procs)).toEqual([])
	})

	test("the running total goes down the rows as shown and ends at the combo's damage", () => {
		for (const order of ["hit", "step"] as const) {
			const rows = combatRows(COMBO, { ...OPTIONS, order })
			let dealt = 0
			for (const row of rows) {
				dealt += row.damage
				expect(row.dealt).toBeCloseTo(dealt)
				expect(row.targetHealth).toBeCloseTo(DUMMY.health - dealt)
				expect(row.step.targetHealth).toBe(row.targetHealth)
				for (const proc of row.procs) {
					dealt += proc.damage
					expect(proc.dealt).toBeCloseTo(dealt)
					expect(proc.targetHealth).toBeCloseTo(DUMMY.health - dealt)
				}
			}
			expect(dealt).toBeCloseTo(COMBO.total.final)
		}
	})

	test("a marker is a row at its time, with no damage", () => {
		const result = simulate([
			cast("Q"),
			{ kind: "situation", effectId: "jax-passive" },
			ATTACK,
		])
		const rows = combatRows(result, { ...OPTIONS, order: "hit" })

		expect(rows.map(({ index }) => index)).toEqual([0, 1, 2])
		expect(rows[1]?.damage).toBe(0)
		expect(rows[1]?.lands).toBeUndefined()
	})
})

describe("damageParts", () => {
	const names = combatNames({ passiveName: "", spells: [], effects: [] })
	const viewOf = (step: CombatStep | undefined) =>
		stepView(step as CombatStep, { names, ...OPTIONS })

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
		const rows = combatRows(COMBO, { ...OPTIONS, order: "step" })

		expect(damageParts(viewOf(rows[3]?.step))).toEqual([])
	})
})

describe("procRows", () => {
	test("pairs each of the view's procs with its mini row", () => {
		const [eRow] = combatRows(COMBO, { ...OPTIONS, order: "step" })
		if (!eRow) throw new Error("E has a row")
		const names = combatNames({
			passiveName: "",
			spells: [],
			effects: BUILD_EFFECTS,
		})
		const view = stepView(eRow.step, { names, ...OPTIONS })

		expect(procRows(view, eRow)).toEqual([
			{ view: view.procs[0], row: eRow.procs[0] },
		])
		expect(view.procs[0]?.total.final).toBeCloseTo(eRow.procs[0]?.damage ?? 0)
	})
})
