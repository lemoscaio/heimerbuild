import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { combatEffects } from "../effects/available-effects"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import { type CombatInput, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-07).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function patchFile(file: string): Promise<unknown> {
	return Bun.file(new URL(`${PATCH}/${file}`, DATA)).json()
}

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(await patchFile(`champions/${key}.json`))
}

const ITEMS = ItemsFileSchema.parse(await patchFile("items.json")).items

function item(name: string): Item {
	const found = ITEMS.find((entry) => entry.name === name)
	if (!found) throw new Error(`${name} is not in the current patch`)
	return found
}

// 100 armor: each point of reduction reads plainly (100 → 94 at one Carve stack).
const TARGET: CombatTarget = {
	health: 20_000,
	armor: 100,
	magicResist: 50,
	level: 9,
}

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	items?: readonly Item[]
}

function simulate(setup: Setup, actions: readonly CombatAction[]) {
	const items = setup.items ?? []
	const input: CombatInput = {
		build: {
			champion: setup.champion,
			patch: PATCH,
			level: setup.level,
			items,
			shards: [],
			ranks: setup.ranks,
		},
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: [],
			runes: [],
			items,
		}),
		summoners: [],
		target: TARGET,
		actions,
	}
	return simulateCombat(input)
}

/** The damage dealt in a step, in order. */
function hits(result: CombatResult, step: number): DealtDamage[] {
	return (result.steps[step]?.events ?? []).flatMap((event) =>
		event.kind === "hit" && "damage" in event ? [event.damage] : [],
	)
}

/** Physical damage at `armor`: 100 / (100 + armor) of the raw. */
function atArmor({ raw }: DealtDamage, armor: number) {
	return (raw * 100) / (100 + armor)
}

function armorAfter(result: CombatResult, step: number) {
	return result.steps[step]?.resists?.armor
}

const ATTACK: CombatAction = { kind: "attack" }

describe("Black Cleaver's Carve (wiki: 6% armor per stack, up to 5, for 6 s)", async () => {
	const darius: Setup = {
		champion: await champion("Darius"),
		level: 9,
		// No E: its passive armor penetration would hide the numbers.
		ranks: { Q: 1, W: 1, E: 0, R: 0 },
		items: [item("Black Cleaver")],
	}

	test("each attack lands on the armor the earlier ones left, then adds its stack", () => {
		const result = simulate(darius, Array(6).fill(ATTACK))
		const armorBefore = [100, 94, 88, 82, 76, 70]

		for (const [step, armor] of armorBefore.entries()) {
			const [hit] = hits(result, step)
			if (!hit) throw new Error(`no hit at step ${step}`)
			expect(hit.final).toBeCloseTo(atArmor(hit, armor))
		}
		expect(armorAfter(result, 0)).toBeCloseTo(94)
		expect(armorAfter(result, 4)).toBeCloseTo(70)
		// Five stacks at most: 30%.
		expect(armorAfter(result, 5)).toBeCloseTo(70)
		expect(result.steps[0]?.resists?.magicResist).toBe(50)
	})

	test("each stack refreshes the 6 s, and the armor comes back once they run out", () => {
		const result = simulate(darius, [
			ATTACK,
			ATTACK,
			{ kind: "wait", seconds: 7 },
			ATTACK,
		])
		const carve = result.steps[1]?.active.find(
			({ effectId }) => effectId === "black-cleaver-carve",
		)

		expect(carve?.holder).toBe("target")
		expect(carve?.stacks).toBe(2)
		expect(carve?.endsAt).toBeCloseTo((result.steps[1]?.time ?? 0) + 6)
		expect(result.steps[2]?.resists).toBeUndefined()
		const [hit] = hits(result, 3)
		if (!hit) throw new Error("no hit after the wait")
		expect(hit.final).toBeCloseTo(atArmor(hit, 100))
	})

	test("an ability's physical damage reads the stack it applies", () => {
		const result = simulate(darius, [{ kind: "ability", slot: "Q" }])
		const [hit] = hits(result, 0)
		if (!hit) throw new Error("no Decimate hit")

		expect(hit.final).toBeCloseTo(atArmor(hit, 94))
	})

	test("adds one stack per moment, however many physical hits land then", async () => {
		const ezreal: Setup = {
			champion: await champion("Ezreal"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
			items: [item("Black Cleaver"), item("Trinity Force")],
		}
		// Mystic Shot and the Trinity Force spellblade it spends land together.
		const result = simulate(ezreal, [{ kind: "ability", slot: "Q" }])

		expect(hits(result, 0)).toHaveLength(2)
		expect(armorAfter(result, 0)).toBeCloseTo(94)
	})

	test("magic damage adds no stack", async () => {
		const ezreal: Setup = {
			champion: await champion("Ezreal"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
			items: [item("Black Cleaver")],
		}
		const result = simulate(ezreal, [{ kind: "ability", slot: "W" }])

		expect(result.steps[0]?.resists).toBeUndefined()
	})
})

describe("Rengar's Thrill of the Hunt: the leap reduces armor (wiki: 15 / 20 / 25 for 4 s)", async () => {
	const rengar: Setup = {
		champion: await champion("Rengar"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	const R: CombatAction = { kind: "ability", slot: "R" }

	test("the leap's own hit lands on full armor; the hits after it on 15 less, for 4 s", () => {
		const result = simulate(rengar, [R, ATTACK, ATTACK])
		const [leap] = hits(result, 1)
		const [next] = hits(result, 2)
		if (!leap || !next) throw new Error("missing hits")

		expect(armorAfter(result, 0)).toBeUndefined()
		expect(leap.final).toBeCloseTo(atArmor(leap, 100))
		expect(armorAfter(result, 1)).toBe(85)
		expect(next.final).toBeCloseTo(atArmor(next, 85))
		const reduction = result.steps[1]?.active.find(
			({ effectId }) => effectId === "rengar-r-armor-reduction",
		)
		expect(reduction?.endsAt).toBeCloseTo((result.steps[1]?.time ?? 0) + 4)
	})

	test("Savagery out of the camouflage is the leap too", () => {
		const result = simulate(rengar, [R, { kind: "ability", slot: "Q" }])
		const [savagery] = hits(result, 1)
		if (!savagery) throw new Error("no Savagery hit")

		expect(savagery.final).toBeCloseTo(atArmor(savagery, 100))
		expect(armorAfter(result, 1)).toBe(85)
	})

	test("is camouflaged until the leap, and without one there is no reduction", () => {
		const result = simulate(rengar, [R, { kind: "wait", seconds: 30 }])

		expect(result.steps[0]?.waiting).toEqual([
			expect.objectContaining({
				effectId: "rengar-r-armor-reduction",
				label: "camouflaged",
			}),
		])
		expect(result.steps.some(({ resists }) => resists)).toBe(false)
		expect(
			result.steps
				.flatMap(({ active }) => active)
				.some(({ effectId }) => effectId === "rengar-r-armor-reduction"),
		).toBe(false)
	})

	test("adds to Black Cleaver: flat reduction first, then the percent", () => {
		const result = simulate({ ...rengar, items: [item("Black Cleaver")] }, [
			R,
			ATTACK,
		])

		// The R cast's damage adds a Carve stack, the leap a second: (100 − 15) × 0.88.
		expect(armorAfter(result, 1)).toBeCloseTo(74.8)
	})
})
