import { describe, expect, test } from "bun:test"
import type { CombatResult, CombatStep } from "@/lib/combat/combat"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import {
	attacksOnlyNote,
	combatNames,
	combatTotals,
	damageTypeParts,
	markerView,
	outcomeChoice,
	outcomeViews,
	resistChangeText,
	runningEffectText,
	stepView,
	strictOutcomeViews,
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
		bound({ id: "teemo-e", holder: "target" }, "Toxic Shot"),
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

	test("adds up the hits of one source and type into one line", () => {
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

	test("names an effect's hit with its label, apart from its source's other effects (issue 380)", () => {
		const names = combatNames({
			passiveName: "Blaze",
			spells: [],
			effects: [
				bound({ id: "brand-blaze" }, "Blaze"),
				bound({ id: "brand-blaze-detonation", label: "detonation" }, "Blaze"),
			],
		})
		const detonated = stepView(
			{
				...STEP,
				events: [
					{
						kind: "hit",
						time: 2.5,
						source: { kind: "effect", effectId: "brand-blaze-detonation" },
						damage: { type: "magic", raw: 150, final: 100 },
					},
				],
			},
			{ names, target: TARGET },
		)

		expect(detonated.hits).toEqual([
			{
				name: "Blaze (detonation)",
				type: "magic",
				raw: 150,
				final: 100,
				count: 1,
			},
		])
	})

	test("names the marks it moved, the effects running after it and the target's health left", () => {
		expect(view.marks).toEqual([
			{ mark: "Harrier", change: "consumed", fromMarker: false },
		])
		expect(view.effects).toEqual([
			{ name: "Heightened Senses (passive)", until: 2 },
		])
		expect(view.healthShare).toBe(0.91)
	})

	test("says which of the target's resistances its reductions changed, from its own to now", () => {
		const carved = stepView(
			{ ...STEP, resists: { armor: 35.25, magicResist: 50 } },
			{ names: NAMES, target: TARGET },
		)

		expect(view.resists).toEqual([])
		expect(carved.resists).toEqual([{ resist: "armor", from: 50, to: 35.25 }])
		expect(carved.resists.map(resistChangeText)).toEqual([
			"Target armor 50 → 35.3",
		])
	})

	test("says what a running effect's pause switched off, and until when", () => {
		const paused = stepView(
			{
				...STEP,
				active: [
					{
						effectId: "quinn-w-passive",
						holder: "attacker",
						startedAt: 0,
						endsAt: 2,
						stacks: 1,
						paused: {
							until: 1,
							grants: ["movementSpeedPercent", "movementSpeedFlat"],
						},
					},
				],
			},
			{ names: NAMES, target: TARGET },
		)

		expect(paused.effects).toEqual([
			{
				name: "Heightened Senses (passive)",
				until: 2,
				paused: { label: "Move Speed", until: 1 },
			},
		])
	})

	test("says an effect waiting in its state, and from when it enters it (issue 372)", () => {
		const names = combatNames({
			passiveName: "Deadly Venom",
			spells: [],
			effects: [bound({ id: "twitch-q-active" }, "Ambush")],
		})
		const ambush = (from?: number) =>
			stepView(
				{
					...STEP,
					active: [],
					waiting: [
						{
							effectId: "twitch-q-active",
							label: "camouflaged",
							...(from !== undefined && { from }),
							until: 11,
						},
					],
				},
				{ names, target: TARGET },
			).effects.map(runningEffectText)

		expect(ambush(1)).toEqual(["Ambush · camouflaged from 1.00 s"])
		expect(ambush()).toEqual(["Ambush · camouflaged until 11.00 s"])
	})

	test("a running effect's chip says when it ends and what its pause holds off", () => {
		expect(
			runningEffectText({
				name: "Harrowed Path",
				until: 8,
				paused: { label: "Move Speed", until: 1 },
			}),
		).toBe("Harrowed Path · until 8.00 s · Move Speed paused until 1.00 s")
		expect(runningEffectText({ name: "Teemo's W" })).toBe("Teemo's W")
	})

	test("says the stacks of an effect that has several (issue 417)", () => {
		const names = combatNames({
			passiveName: "Courage",
			spells: [],
			effects: [bound({ id: "conqueror" }, "Conqueror")],
		})
		const conqueror = stepView(
			{
				...STEP,
				active: [
					{
						effectId: "conqueror",
						holder: "attacker",
						startedAt: 0,
						endsAt: 5.26,
						stacks: 6,
						maxStacks: 12,
					},
				],
			},
			{ names, target: TARGET },
		).effects.map(runningEffectText)

		expect(conqueror).toEqual(["Conqueror · 6/12 stacks · until 5.26 s"])
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
		byType: {
			physical: { raw: 100, final: 60 },
			magic: { raw: 50, final: 30 },
			true: { raw: 0, final: 0 },
		},
		duration: 1.2,
		activeUntil: 1.2,
	} satisfies CombatResult

	test("gives the damage, its share of the target's health, the time and the health left", () => {
		expect(combatTotals(result, TARGET)).toEqual({
			final: 90,
			byType: [
				{ type: "physical", final: 60, percent: 67 },
				{ type: "magic", final: 30, percent: 33 },
			],
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

describe("damageTypeParts", () => {
	const none = { raw: 0, final: 0 }
	const dealt = (final: number) => ({ raw: final * 2, final })

	test("lists the types that dealt damage, physical, magic then true, with whole percents adding up to 100", () => {
		const parts = damageTypeParts({
			physical: dealt(100),
			magic: dealt(100),
			true: dealt(100),
		})

		expect(parts.map(({ type }) => type)).toEqual(["physical", "magic", "true"])
		expect(parts.map(({ percent }) => percent)).toEqual([34, 33, 33])
	})

	test("gives the points left to the largest remainders, so a small part keeps its share", () => {
		const parts = damageTypeParts({
			physical: dealt(186),
			magic: dealt(807),
			true: dealt(7),
		})

		expect(parts.map(({ percent }) => percent)).toEqual([18, 81, 1])
		expect(parts.reduce((sum, { final }) => sum + final, 0)).toBe(1000)
	})

	test("leaves out a type without damage, and has no parts when nothing dealt any", () => {
		expect(
			damageTypeParts({ physical: none, magic: dealt(40), true: none }),
		).toEqual([{ type: "magic", final: 40, percent: 100 }])
		expect(
			damageTypeParts({ physical: none, magic: none, true: none }),
		).toEqual([])
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

	test("an empowering effect with stacks says them (Lethal Tempo, issue 417)", () => {
		const [tempo] = outcomeViews(
			[
				{
					kind: "empowered",
					effectId: "hail-of-blades",
					happened: true,
					stacks: { count: 3, max: 6 },
				},
			],
			{ names },
		)

		expect(tempo?.detail).toBe("3/6 stacks")
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
				kind: "empowered",
				label: "Hail of Blades",
				happened: true,
				detail: "2/3",
				changed: false,
			},
			{
				id: "mark-consumed:quinn-harrier",
				kind: "mark-consumed",
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

describe("damage over time on its step (issue 345)", () => {
	const poison = (time: number, owner: number) =>
		({
			kind: "hit",
			time,
			source: { kind: "effect", effectId: "teemo-e" },
			damage: { type: "magic", raw: 30, final: 20 },
			tick: { owner },
		}) as const
	const applied: CombatStep = {
		...STEP,
		events: [STEP.events[0] ?? poison(0, 0), poison(1, 0)],
		active: [
			{
				effectId: "teemo-e",
				holder: "target",
				startedAt: 0,
				endsAt: 4,
				stacks: 1,
			},
		],
		damageOverTime: [
			{
				effectId: "teemo-e",
				application: "applied",
				stacks: 1,
				ticks: [1, 2, 3, 4].map((time) => ({
					time,
					damage: { type: "magic", raw: 30, final: 20 },
				})),
				endsAt: 4,
			},
		],
	}
	const view = stepView(applied, { names: NAMES, target: TARGET })

	test("one line with its ticks, damage and last tick, instead of hit lines and a chip", () => {
		expect(view.damageOverTime).toEqual([
			{
				effectId: "teemo-e",
				name: "Toxic Shot",
				application: "applied",
				stacks: 1,
				ticks: [1, 2, 3, 4].map((time) => ({
					time,
					type: "magic",
					raw: 30,
					final: 20,
				})),
				type: "magic",
				raw: 120,
				final: 80,
				until: 4,
				notModeled: [],
			},
		])
		expect(view.hits.map(({ name }) => name)).toEqual(["Attack"])
		expect(view.effects).toEqual([])
	})

	test("the step's total counts the ticks it owns, not those of another step landing during it", () => {
		expect(view.total).toEqual({ raw: 220, final: 140 })
		const later = stepView(
			{ ...STEP, events: [poison(2, 0)], damageOverTime: [] },
			{ names: NAMES, target: TARGET },
		)
		expect(later.total).toEqual({ raw: 0, final: 0 })
	})

	test("a refresh that added no tick runs until its end", () => {
		const refresh = stepView(
			{
				...STEP,
				damageOverTime: [
					{
						effectId: "teemo-e",
						application: "refreshed",
						stacks: 1,
						ticks: [],
						endsAt: 4.7,
					},
				],
			},
			{ names: NAMES, target: TARGET },
		)
		expect(refresh.damageOverTime[0]).toMatchObject({
			application: "refreshed",
			final: 0,
			until: 4.7,
		})
	})

	test("a delayed one says when it took effect, and runs until its last tick", () => {
		const trap = stepView(
			{
				...STEP,
				damageOverTime: [
					{
						effectId: "teemo-e",
						application: "applied",
						stacks: 1,
						ticks: [3.45, 4.45].map((time) => ({
							time,
							damage: { type: "magic", raw: 30, final: 20 },
						})),
						endsAt: 6.45,
						delayed: { label: "detonates", at: 2.45 },
					},
				],
			},
			{ names: NAMES, target: TARGET },
		)
		expect(trap.damageOverTime[0]).toMatchObject({
			delayed: { label: "detonates", at: 2.45 },
			until: 4.45,
		})
	})

	test("strict mode's chips leave out an applied one: its line says it", () => {
		const outcomes = outcomeViews(
			[
				{ kind: "damage-over-time", effectId: "teemo-e", happened: true },
				{ kind: "damage-over-time", effectId: "liandry", happened: false },
			],
			{ names: NAMES },
		)
		expect(strictOutcomeViews(outcomes).map(({ id }) => id)).toEqual([
			"damage-over-time:liandry",
		])
		expect(outcomes[0]?.label).toBe("Toxic Shot: applies")
	})
})
