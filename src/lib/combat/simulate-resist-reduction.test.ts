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

describe("Rengar's Thrill of the Hunt: the leap deals R's bonus damage, then reduces armor (wiki: 100% AD, then 15 / 20 / 25 for 4 s)", async () => {
	const rengar: Setup = {
		champion: await champion("Rengar"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	const R: CombatAction = { kind: "ability", slot: "R" }

	/** The step's hits by source: "attack", an ability's damage name, or an effect id. */
	function hitsBySource(result: CombatResult, step: number) {
		return (result.steps[step]?.events ?? []).flatMap((event) => {
			if (event.kind !== "hit" || !("damage" in event)) return []
			const { source } = event
			const name =
				source.kind === "attack"
					? "attack"
					: source.kind === "ability"
						? source.name
						: source.effectId
			return [{ name, damage: event.damage }]
		})
	}

	test("R, AA: the cast deals nothing; the attack lands, then the bonus, both on full armor, then the armor drops for 4 s", () => {
		const result = simulate(rengar, [R, ATTACK, ATTACK])
		const leap = hitsBySource(result, 1)
		const [next] = hits(result, 2)
		if (!next) throw new Error("no hit after the leap")

		expect(hits(result, 0)).toEqual([])
		expect(armorAfter(result, 0)).toBeUndefined()
		expect(leap.map(({ name }) => name)).toEqual([
			"attack",
			"rengar-r-armor-reduction",
		])
		const [attack, bonus] = leap.map(({ damage }) => damage)
		if (!attack || !bonus) throw new Error("missing leap hits")
		// 100% AD: as much as the attack's own hit.
		expect(bonus.raw).toBeCloseTo(attack.raw)
		expect(bonus.final).toBeCloseTo(atArmor(bonus, 100))
		expect(armorAfter(result, 1)).toBe(85)
		expect(next.final).toBeCloseTo(atArmor(next, 85))
		const reduction = result.steps[1]?.active.find(
			({ effectId }) => effectId === "rengar-r-armor-reduction",
		)
		expect(reduction?.endsAt).toBeCloseTo((result.steps[1]?.time ?? 0) + 4)
	})

	test("Savagery out of the camouflage is the leap too: its attack, its bonus, then R's", () => {
		const result = simulate(rengar, [R, { kind: "ability", slot: "Q" }])
		const leap = hitsBySource(result, 1)

		expect(leap.map(({ name }) => name)).toEqual([
			"attack",
			"QTotalDamage",
			"rengar-r-armor-reduction",
		])
		for (const { damage } of leap) {
			expect(damage.final).toBeCloseTo(atArmor(damage, 100))
		}
		expect(armorAfter(result, 1)).toBe(85)
	})

	test.each(["W", "E"] as const)(
		"a cast of %s ends Thrill of the Hunt without a leap: no bonus, no reduction, even on the next attack",
		(slot) => {
			const result = simulate(rengar, [R, { kind: "ability", slot }, ATTACK])

			expect(result.steps[1]?.waiting).toBeUndefined()
			expect(hitsBySource(result, 1).map(({ name }) => name)).not.toContain(
				"rengar-r-armor-reduction",
			)
			expect(hitsBySource(result, 2).map(({ name }) => name)).toEqual([
				"attack",
			])
			expect(result.steps.some(({ resists }) => resists)).toBe(false)
		},
	)

	test("is camouflaged until the leap, and without one there is no bonus and no reduction", () => {
		const result = simulate(rengar, [R, { kind: "wait", seconds: 30 }])

		expect(result.steps[0]?.waiting).toEqual([
			expect.objectContaining({
				effectId: "rengar-r-armor-reduction",
				label: "camouflaged",
			}),
		])
		expect(result.total.final).toBe(0)
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

		// The leap's attack adds one Carve stack (its bonus lands in the same moment): (100 − 15) × 0.94.
		expect(armorAfter(result, 1)).toBeCloseTo(79.9)
	})
})
