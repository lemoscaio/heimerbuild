import { describe, expect, test } from "bun:test"
import type { CombatResult, CombatStep } from "@/lib/combat/combat"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import {
	attacksOnlyNote,
	combatNames,
	combatTotals,
	markerView,
	outcomeChoice,
	outcomeViews,
	stepView,
} from "./combat-view"

const TARGET = { health: 1000, armor: 50, magicResist: 50, level: 9 }

function bound(effect: Partial<Effect> & { id: string }, name: string) {
	return {
		id: effect.id,
		name,
		icon: "",
		effect: effect as Effect,
	} as BuildEffect
}

const NAMES = combatNames({
	passiveName: "Harrier",
	spells: [{ slot: "E", name: "Vault" }],
	effects: [
		bound(
			{
				id: "quinn-harrier-mark",
				applies: { mark: "quinn-harrier", duration: 4, consumedBy: ["attack"] },
			},
			"Harrier",
		),
		bound({ id: "quinn-w-passive", part: "passive" }, "Heightened Senses"),
		bound({ id: "trinity-force-spellblade" }, "Trinity Force"),
	],
})

const STEP: CombatStep = {
	action: { kind: "attack" },
	time: 0,
	outcomes: [],
	damageOverTime: [],
	events: [
		{
			kind: "hit",
			time: 0,
			source: { kind: "attack" },
			damage: { type: "physical", raw: 100, final: 60 },
		},
		{ kind: "mark-consumed", time: 0, mark: "quinn-harrier" },
		{
			kind: "hit",
			time: 0,
			source: { kind: "effect", effectId: "trinity-force-spellblade" },
			damage: { type: "magic", raw: 50, final: 30 },
		},
		{
			kind: "hit",
			time: 0,
			source: { kind: "ability", slot: "passive", name: "BonusDamage" },
			notModeled: ["a buff counter"],
		},
	],
	active: [
		{
			effectId: "quinn-w-passive",
			holder: "attacker",
			startedAt: 0,
			endsAt: 2,
			stacks: 1,
		},
	],
	marks: [],
	targetHealth: 910,
}

describe("stepView", () => {
	const view = stepView(STEP, { names: NAMES, target: TARGET })

	test("lists each hit by name, with not-modeled ones apart, and the step's total", () => {
		expect(view.hits).toEqual([
			{ name: "Attack", type: "physical", raw: 100, final: 60, count: 1 },
			{ name: "Trinity Force", type: "magic", raw: 50, final: 30, count: 1 },
			{ name: "Harrier", notModeled: ["a buff counter"] },
		])
		expect(view.total).toEqual({ raw: 150, final: 90 })
		expect(view.mainType).toBe("physical")
	})

	test("adds up the hits of one source and type into one line (a burn's ticks)", () => {
		const tick = {
			kind: "hit",
			time: 0,
			source: { kind: "effect", effectId: "trinity-force-spellblade" },
			damage: { type: "magic", raw: 50, final: 30 },
		} as const
		const ticking = stepView(
			{ ...STEP, events: [tick, { ...tick, time: 1 }] },
			{ names: NAMES, target: TARGET },
		)

		expect(ticking.hits).toEqual([
			{ name: "Trinity Force", type: "magic", raw: 100, final: 60, count: 2 },
		])
	})

	test("counts a cast's damages that land together as one hit (a base and a share of health)", () => {
		const part = {
			kind: "hit",
			time: 0.5,
			source: { kind: "ability", slot: "E", name: "BaseDamage" },
			damage: { type: "magic", raw: 50, final: 30 },
		} as const
		const cast = stepView(
			{
				...STEP,
				events: [
					part,
					{ ...part, source: { ...part.source, name: "PercentDamage" } },
				],
			},
			{ names: NAMES, target: TARGET },
		)

		expect(cast.hits).toEqual([
			{ name: "Vault", type: "magic", raw: 100, final: 60, count: 1 },
		])
	})

	test("names the marks it moved, the effects running after it and the target's health left", () => {
		expect(view.marks).toEqual([
			{ mark: "Harrier", change: "consumed", fromMarker: false },
		])
		expect(view.effects).toEqual(["Heightened Senses (passive) · until 2.00 s"])
		expect(view.healthShare).toBe(0.91)
	})

	test("says when a mark or a spent effect came from a marker", () => {
		const fromStart = stepView(
			{
				...STEP,
				events: [
					{
						kind: "mark-consumed",
						time: 0,
						mark: "quinn-harrier",
						fromSituation: true,
					},
					{
						kind: "hit",
						time: 0,
						source: {
							kind: "effect",
							effectId: "trinity-force-spellblade",
							fromSituation: true,
						},
						damage: { type: "magic", raw: 50, final: 30 },
					},
				],
			},
			{ names: NAMES, target: TARGET },
		)

		expect(fromStart.marks).toEqual([
			{ mark: "Harrier", change: "consumed", fromMarker: true },
		])
		expect(fromStart.hits[0]).toMatchObject({
			name: "Trinity Force (from marker)",
		})
	})

	test("leaves out a mark its outcome reports, and an effect whose outcome says it empowered the step", () => {
		const reported = stepView(
			{
				...STEP,
				outcomes: [
					{ kind: "mark-consumed", mark: "quinn-harrier", happened: true },
					{
						kind: "empowered",
						effectId: "quinn-w-passive",
						happened: true,
					},
				],
			},
			{ names: NAMES, target: TARGET },
		)

		expect(reported.marks).toEqual([])
		expect(reported.effects).toEqual([])
	})
})

describe("combatTotals", () => {
	const result = {
		steps: [STEP],
		total: { raw: 150, final: 90 },
		byType: {} as CombatResult["byType"],
		duration: 1.2,
		activeUntil: 1.2,
	} satisfies CombatResult

	test("gives the damage, its share of the target's health, the time and the health left", () => {
		expect(combatTotals(result, TARGET)).toEqual({
			final: 90,
			healthShare: 0.09,
			duration: 1.2,
			healthLeft: 910,
			activeUntil: 1.2,
			forcedMarkers: 0,
		})
	})

	test("caps the share at the whole target, and counts the kill's step among the actions", () => {
		const marker: CombatStep = {
			...STEP,
			action: { kind: "situation", effectId: "hail-of-blades" },
			situation: { status: "forced", readyAt: 10 },
		}

		expect(
			combatTotals(
				{
					...result,
					steps: [marker, STEP, marker, STEP],
					total: { raw: 2000, final: 1500 },
					kill: { time: 1, step: 3 },
				},
				TARGET,
			),
		).toMatchObject({
			healthShare: 1,
			kill: { time: 1, step: 2 },
			healthLeft: 0,
			forcedMarkers: 2,
		})
	})
})

describe("outcomeViews", () => {
	const names = combatNames({
		passiveName: "Harrier",
		spells: [],
		effects: [
			bound({ id: "hail-of-blades" }, "Hail of Blades"),
			bound(
				{
					id: "quinn-harrier-mark",
					applies: {
						mark: "quinn-harrier",
						duration: 4,
						consumedBy: ["attack"],
					},
				},
				"Harrier",
			),
		],
	})

	test("names each outcome, with an empowered attack's charge or when the effect is ready again", () => {
		expect(
			outcomeViews(
				[
					{
						kind: "empowered",
						effectId: "hail-of-blades",
						happened: true,
						charge: { used: 2, max: 3 },
					},
					{ kind: "mark-consumed", mark: "quinn-harrier", happened: false },
				],
				{ names },
			),
		).toEqual([
			{
				id: "empowered:hail-of-blades",
				label: "Hail of Blades",
				happened: true,
				detail: "2/3",
				changed: false,
			},
			{
				id: "mark-consumed:quinn-harrier",
				label: "Harrier: consumes the mark",
				happened: false,
				changed: false,
			},
		])
		expect(
			outcomeViews(
				[
					{
						kind: "empowered",
						effectId: "hail-of-blades",
						happened: false,
						readyAt: 10.4,
					},
				],
				{ names },
			)[0]?.detail,
		).toBe("on cooldown · ready at 10.40 s")
	})

	test("in free mode, marks an outcome that differs from the computed one", () => {
		const [applied] = outcomeViews(
			[{ kind: "mark-applied", mark: "quinn-harrier", happened: false }],
			{ names, seed: { "mark-applied:quinn-harrier": true } },
		)

		expect(applied).toMatchObject({
			label: "Harrier: applies the mark",
			changed: true,
		})
	})

	test("an ability step names the outcomes only attacks have", () => {
		const attack = [
			{ kind: "empowered", effectId: "hail-of-blades" },
			{ kind: "mark-consumed", mark: "quinn-harrier" },
		] as const

		expect(
			attacksOnlyNote(
				[{ kind: "mark-applied", mark: "quinn-harrier" }],
				attack,
				names,
			),
		).toBe("Hail of Blades and Harrier: attacks only")
		expect(attacksOnlyNote(attack, attack, names)).toBeUndefined()
	})
})

describe("outcomeChoice", () => {
	test("keeps an answer that differs from the computed outcome, and drops one that matches it", () => {
		expect(outcomeChoice({ happened: true, changed: false }, false)).toBe(false)
		expect(outcomeChoice({ happened: true, changed: false }, true)).toBe(
			undefined,
		)
		// Changed to yes, computed no: answering no goes back to the computed one.
		expect(outcomeChoice({ happened: true, changed: true }, false)).toBe(
			undefined,
		)
	})
})

describe("markerView", () => {
	const options = { label: "Hail of Blades ready", atStart: false, free: false }

	test("says where it applies, or that the rune came back", () => {
		expect(
			markerView(
				{ situation: { status: "applied" } },
				{
					...options,
					atStart: true,
				},
			).detail,
		).toBe("at the start")
		expect(
			markerView(
				{ situation: { status: "applied", readyAt: 10.4 } },
				{ ...options, kind: "ready" },
			).detail,
		).toBe("ready again here (since 10.40 s)")
	})

	test("a marker on cooldown is ignored in strict mode and forced in free mode, and a useless one has no effect", () => {
		expect(
			markerView({ situation: { status: "ignored", readyAt: 7.6 } }, options),
		).toEqual({
			label: "Hail of Blades ready",
			detail: "on cooldown until 7.60 s · ignored (use Free mode to force it)",
			tone: "ignored",
		})
		expect(
			markerView(
				{ situation: { status: "forced", readyAt: 10.4 } },
				{ ...options, free: true },
			),
		).toEqual({
			label: "Hail of Blades ready",
			detail: "on cooldown until 10.40 s · forced",
			tone: "forced",
		})
		expect(
			markerView(
				{ situation: { status: "no-effect", reason: "already-marked" } },
				options,
			),
		).toMatchObject({ detail: "already marked · no effect", tone: "no-effect" })
	})

	test("in free mode, a marker only applies", () => {
		expect(
			markerView(
				{ situation: { status: "applied", readyAt: 3 } },
				{ ...options, free: true },
			).detail,
		).toBe("applies: from here")
	})
})
