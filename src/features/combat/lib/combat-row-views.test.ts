import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import type { CombatItem, CombatTarget } from "@/lib/combat/combat"
import { simulateCombat } from "@/lib/combat/simulate-combat"
import { combatEffects } from "@/lib/effects/available-effects"
import { combatRowViews } from "./combat-row-views"
import { combatNames } from "./combat-view"
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

const BRAND = await champion("Brand")
// Level 9 with Q W E W W R W E W.
const RANKS = { Q: 1, W: 5, E: 2, R: 1 }
const BUILD_EFFECTS = combatEffects({
	patch: PATCH,
	champion: BRAND,
	ranks: RANKS,
	spells: [],
	runes: [],
	items: [],
})
const OPTIONS = {
	target: DUMMY,
	effects: effectsById(BUILD_EFFECTS),
	names: combatNames({ passiveName: "Blaze", spells: [], effects: [] }),
}

function simulate(actions: readonly CombatItem[]) {
	return simulateCombat({
		build: {
			champion: BRAND,
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

const cast = (slot: "Q" | "W" | "E") => ({ kind: "ability", slot }) as const

// Three Blaze stacks: the detonation lands 2 s after W, during the wait.
const COMBO = simulate([
	cast("E"),
	cast("Q"),
	cast("W"),
	{ kind: "wait", seconds: 3 },
])

describe("combatRowViews (issue 405)", () => {
	test("each step's card shows its row's health and so far, in either order", () => {
		for (const order of ["hit", "step"] as const) {
			const rows = combatRowViews(COMBO, { ...OPTIONS, order })
			let dealt = 0
			for (const { row, view } of rows) {
				dealt += row.damage
				expect(row.dealt).toBeCloseTo(dealt)
				expect(row.healthShare).toBeCloseTo(row.targetHealth / DUMMY.health)
				if ("healthShare" in view) {
					expect(view.healthShare * DUMMY.health).toBeCloseTo(row.targetHealth)
				}
			}
		}
	})

	test("the wait's health leaves out the detonation landing after it, which is a row of its own", () => {
		const rows = combatRowViews(COMBO, { ...OPTIONS, order: "step" })
		const waitAt = rows.findIndex(
			({ row }) => row.kind === "step" && row.step.action.kind === "wait",
		)
		const wait = rows[waitAt]
		const detonation = rows[waitAt + 1]
		if (wait?.kind !== "step" || detonation?.kind !== "proc") {
			throw new Error("the detonation follows the wait")
		}

		// The simulator's step counts the detonation, which lands while the wait runs.
		expect(COMBO.steps[3]?.targetHealth).toBeLessThan(wait.row.targetHealth)
		expect(wait.view.healthShare * DUMMY.health).toBeCloseTo(
			wait.row.targetHealth,
		)
		expect(detonation.row.index).toBe(2)
		expect(detonation.row.targetHealth).toBeCloseTo(
			wait.row.targetHealth - detonation.row.damage,
		)
	})
})
