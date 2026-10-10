import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import type {
	CombatItem,
	CombatResult,
	CombatTarget,
} from "@/lib/combat/combat"
import { simulateCombat } from "@/lib/combat/simulate-combat"
import { combatEffects } from "@/lib/effects/available-effects"
import { abilitiesInForm } from "@/lib/form-abilities"
import {
	type CombatTimeline,
	combatTimeline,
	type TimelineProc,
	type TimelineStep,
} from "./combat-timeline"
import { TIMELINE_GEOMETRY, timelineLayout } from "./combat-timeline-layout"
import { combatNames } from "./combat-view"

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

type Ranks = Record<"Q" | "W" | "E" | "R", number>

async function timelineOf(
	key: string,
	ranks: Ranks,
	actions: readonly CombatItem[],
): Promise<{ result: CombatResult; timeline: CombatTimeline }> {
	const build = await champion(key)
	const effects = combatEffects({
		patch: PATCH,
		champion: build,
		ranks,
		spells: [],
		runes: [],
		items: [],
	})
	const result = simulateCombat({
		build: {
			champion: build,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks,
		},
		effects,
		summoners: [],
		target: DUMMY,
		actions,
	})
	const names = combatNames({
		passiveName: build.abilities.passive.name,
		spells: abilitiesInForm(build.abilities, undefined).spells,
		effects,
	})
	return {
		result,
		timeline: combatTimeline(result, { target: DUMMY, names, effects }),
	}
}

const ATTACK = { kind: "attack" } as const
const cast = (slot: "Q" | "W" | "E" | "R") =>
	({ kind: "ability", slot }) as const

// Jax level 9 with E Q W W W R W Q W; Counter Strike first, its strike 1 s later.
const JAX = await timelineOf("Jax", { Q: 2, W: 5, E: 1, R: 1 }, [
	cast("E"),
	cast("Q"),
	cast("W"),
	ATTACK,
	ATTACK,
	ATTACK,
])

function steps(timeline: CombatTimeline) {
	return timeline.entries.filter(
		(entry): entry is TimelineStep => entry.kind === "step",
	)
}

function procs(timeline: CombatTimeline) {
	return timeline.entries.filter(
		(entry): entry is TimelineProc => entry.kind === "proc",
	)
}

function dealt({ entries }: CombatTimeline) {
	return entries.reduce(
		(sum, entry) => sum + (entry.kind === "marker" ? 0 : entry.damage),
		0,
	)
}

describe("combatTimeline", () => {
	test("Counter Strike's strike has its own entry at 1.00 s, on E's step, which deals nothing at its cast", () => {
		const [strike] = procs(JAX.timeline)
		const [e] = steps(JAX.timeline)

		expect(procs(JAX.timeline)).toHaveLength(1)
		expect(strike?.index).toBe(0)
		expect(strike?.time).toBeCloseTo(1)
		expect(strike?.verb).toBe("strikes")
		expect(strike?.damage).toBeGreaterThan(0)
		expect(e?.damage).toBe(0)
		expect(e?.firstProc?.at).toBeCloseTo(1)
		expect(e?.late).toBe(false)
	})

	test("the entries' damage adds up to the totals, and the health goes down with it", () => {
		expect(dealt(JAX.timeline)).toBeCloseTo(JAX.result.total.final)
		const healths = JAX.timeline.entries.flatMap((entry) =>
			entry.kind !== "marker" && entry.targetHealth !== undefined
				? [entry.targetHealth]
				: [],
		)
		expect(healths).toEqual(healths.toSorted((a, b) => b - a))
		expect(healths.at(-1)).toBeCloseTo(DUMMY.health - JAX.result.total.final)
	})

	test("E, Q and W start together and stack in their own columns; the attacks after them don't", () => {
		expect(steps(JAX.timeline).map(({ column }) => column)).toEqual([
			0, 1, 2, 0, 0, 0,
		])
		expect(JAX.timeline.columns).toBe(3)
	})

	test("Empower's windup ends where its hits land, its damage in two parts", () => {
		const empower = steps(JAX.timeline)[2]

		expect(empower?.lands?.first).toBeGreaterThan(empower?.startsAt ?? 0)
		expect(empower?.dots.map(({ time }) => time)).toEqual([
			empower?.lands?.first ?? -1,
		])
		expect(empower?.parts).toHaveLength(2)
	})

	test("the third hit's bonus shows on the attack that deals it", () => {
		const bonuses = steps(JAX.timeline).flatMap(({ bonuses }) => bonuses)

		expect(bonuses).toHaveLength(1)
		expect(bonuses[0]?.final).toBeGreaterThan(0)
	})

	test("the effects' lanes end when the totals say they do, after the last hit", () => {
		const ends = JAX.timeline.lanes.flatMap(({ spans }) =>
			spans.map(({ to }) => to),
		)

		expect(JAX.timeline.lanes.length).toBeGreaterThan(0)
		expect(Math.max(...ends)).toBeCloseTo(JAX.result.activeUntil)
		expect(JAX.timeline.effectsUntil).toBe(JAX.result.activeUntil)
		expect(JAX.timeline.lastHit).toBe(JAX.result.duration)
		expect(JAX.timeline.effectsUntil).toBeGreaterThan(JAX.timeline.lastHit)
	})

	test("a notch on a lane at each attack that stacks the passive", () => {
		const attacks = steps(JAX.timeline)
			.slice(3)
			.map(({ lands }) => lands?.first)
		const [passive] = JAX.timeline.lanes

		expect(passive?.notches).toEqual(expect.arrayContaining(attacks))
	})

	test("entries go by when they happen", () => {
		const times = JAX.timeline.entries.map((entry) =>
			entry.kind === "step" ? entry.startsAt : entry.time,
		)

		expect(times).toEqual(times.toSorted((a, b) => a - b))
	})

	test("a marker is an entry at its time", async () => {
		const { timeline } = await timelineOf("Jax", { Q: 2, W: 5, E: 1, R: 1 }, [
			cast("Q"),
			{ kind: "situation", effectId: "jax-passive" },
			ATTACK,
		])

		expect(timeline.entries.map(({ kind }) => kind)).toEqual([
			"step",
			"marker",
			"step",
		])
	})

	test("Blaze's detonation lands as Q's separate instance, and its lane runs from then to the end", async () => {
		const { result, timeline } = await timelineOf(
			"Brand",
			{ Q: 2, W: 2, E: 2, R: 1 },
			[cast("E"), cast("W"), cast("Q"), cast("R")],
		)
		const [detonation] = procs(timeline)
		const lane = timeline.lanes.find(({ spans }) =>
			spans.some(({ from }) => from === detonation?.time),
		)

		expect(detonation?.index).toBe(2)
		expect(detonation?.time).toBeGreaterThan(result.steps[3]?.time ?? 0)
		expect(lane?.spans.at(-1)?.to).toBeCloseTo(result.activeUntil)
		expect(dealt(timeline)).toBeCloseTo(result.total.final)
	})

	test("Pyroclasm's bounces are dots on its own step; the detonation they set up is its separate instance", async () => {
		const { timeline } = await timelineOf("Brand", { Q: 1, W: 0, E: 0, R: 1 }, [
			cast("R"),
		])
		const [pyroclasm] = steps(timeline)
		const [detonation] = procs(timeline)

		expect(pyroclasm?.dots).toHaveLength(3)
		expect(detonation?.index).toBe(0)
		expect(detonation?.time).toBeGreaterThan(pyroclasm?.lands?.last ?? 0)
	})

	test("a wait keeps its length and deals nothing", async () => {
		const { timeline } = await timelineOf("Jax", { Q: 1, W: 0, E: 0, R: 0 }, [
			{ kind: "wait", seconds: 1.5 },
			ATTACK,
		])
		const [wait] = steps(timeline)

		expect(wait?.wait).toBe(1.5)
		expect(wait?.damage).toBe(0)
		expect(wait?.dots).toEqual([])
	})
})

describe("timelineLayout", () => {
	test("cards never overlap, and none sits above its moment", () => {
		const { cards } = timelineLayout(JAX.timeline)
		const { cardHeight, cardGap } = TIMELINE_GEOMETRY

		cards.forEach((card, index) => {
			const previous = cards[index - 1]
			expect(card.top).toBeGreaterThanOrEqual(card.anchor - cardHeight / 2)
			if (previous) {
				expect(card.top).toBeGreaterThanOrEqual(
					previous.top + cardHeight + cardGap,
				)
			}
		})
	})

	test("the ruler reaches past the effects' end and the last card", async () => {
		const long = await timelineOf(
			"Jax",
			{ Q: 2, W: 5, E: 1, R: 1 },
			Array.from({ length: 14 }, () => ATTACK),
		)
		const layout = timelineLayout(long.timeline)
		const lastCard = layout.cards.at(-1)
		const lastTick = layout.ticks.at(-1)

		expect(layout.cards).toHaveLength(14)
		expect(layout.height).toBeGreaterThan(
			(lastCard?.top ?? 0) + TIMELINE_GEOMETRY.cardHeight,
		)
		expect(lastTick?.time).toBeGreaterThanOrEqual(
			Math.floor(long.timeline.effectsUntil * 2) / 2,
		)
		expect(lastTick?.y).toBeLessThanOrEqual(layout.height)
	})
})
