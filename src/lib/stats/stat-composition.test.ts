import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { runesFileSchema } from "@schemas/rune"
import { availableEffects } from "../effects/available-effects"
import type { EffectOverrides } from "../effects/effect"
import type { MatchStacks } from "../effects/match-stacks"
import { computeBuildStats } from "./compute-build-stats"
import type { StatName } from "./compute-stats"
import type { AbilityRanks } from "./rank-stats"
import {
	type CompositionInput,
	type StatPart,
	statComposition,
} from "./stat-composition"

// Real current-patch data (public/data).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()
const { items } = ItemsFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
)
const { shards } = runesFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/runes.json`, DATA)).json(),
)

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

function item(id: string): Item {
	const found = items.find((entry) => entry.id === id)
	if (!found) throw new Error(`no item ${id}`)
	return found
}

type TestBuild = {
	championKey: string
	level: number
	itemIds: readonly string[]
	shardIds: readonly number[]
	ranks: AbilityRanks
	form?: string
	overrides?: EffectOverrides
	matchStacks?: MatchStacks
}

async function inputOf(build: TestBuild): Promise<CompositionInput> {
	const data = await champion(build.championKey)
	const buildItems = build.itemIds.map(item)
	return {
		champion: data,
		patch: PATCH,
		level: build.level,
		form: build.form,
		items: buildItems,
		shards: build.shardIds.flatMap(
			(id) => shards.find((shard) => shard.id === id) ?? [],
		),
		ranks: build.ranks,
		effects: {
			available: availableEffects({
				patch: PATCH,
				champion: data,
				ranks: build.ranks,
				spells: [],
				runes: [],
				items: buildItems,
			}),
			overrides: build.overrides ?? {},
		},
		matchStacks: build.matchStacks,
	}
}

function sum(parts: readonly StatPart[]) {
	return parts.reduce((total, { value }) => total + value, 0)
}

const JINX: TestBuild = {
	championKey: "Jinx",
	level: 13,
	// Berserker's Greaves, Kraken Slayer, Infinity Edge, Runaan's Hurricane.
	itemIds: ["3006", "6672", "3031", "3085"],
	shardIds: [5005, 5008, 5001],
	ranks: { Q: 3, W: 5, E: 3, R: 2 },
	overrides: { "jinx-q-revd-up": true },
}
const LUX: TestBuild = {
	championKey: "Lux",
	level: 11,
	// Sorcerer's Shoes, Luden's Echo, Shadowflame, Rabadon's Deathcap.
	itemIds: ["3020", "6655", "4645", "3089"],
	shardIds: [5008, 5008, 5001],
	ranks: { Q: 3, W: 1, E: 5, R: 2 },
}
const GAREN: TestBuild = {
	championKey: "Garen",
	level: 11,
	// Stridebreaker, Plated Steelcaps, Dead Man's Plate, Sterak's Gage, Thornmail.
	itemIds: ["6631", "3047", "3742", "3053", "3075"],
	shardIds: [5008, 5008, 5011],
	ranks: { Q: 3, W: 1, E: 5, R: 2 },
}
const NASUS: TestBuild = {
	championKey: "Nasus",
	level: 9,
	// Trinity Force, Plated Steelcaps.
	itemIds: ["3078", "3047"],
	shardIds: [5005, 5008, 5011],
	ranks: { Q: 5, W: 1, E: 2, R: 1 },
	matchStacks: { "siphoning-strike": 250 },
}
const VEIGAR: TestBuild = {
	championKey: "Veigar",
	level: 11,
	// Sorcerer's Shoes, Luden's Echo, Rabadon's Deathcap.
	itemIds: ["3020", "6655", "3089"],
	shardIds: [5008, 5008, 5001],
	ranks: { Q: 5, W: 3, E: 2, R: 1 },
	matchStacks: { "phenomenal-evil": 200 },
}

describe("statComposition", () => {
	test.each([
		["Jinx in Minigun", JINX],
		["Jinx in Rockets", { ...JINX, form: "rockets" }],
		["Lux with Rabadon's", LUX],
		["Garen with Thornmail", GAREN],
		["Nasus with Siphoning Strike stacks", NASUS],
		["Veigar with Phenomenal Evil stacks", VEIGAR],
	] as const)(
		"%s: every stat's parts add up to the panel's total",
		async (_, build) => {
			const input = await inputOf(build)
			const totals = computeBuildStats(input)
			const composition = statComposition(input)
			for (const stat of Object.keys(totals) as StatName[]) {
				expect({ stat, sum: sum(composition[stat]) }).toEqual({
					stat,
					sum: expect.closeTo(totals[stat].total, 9),
				})
			}
		},
	)

	test("a previewed item is flagged and the parts add up to the previewed total", async () => {
		const input = await inputOf(GAREN)
		const composition = statComposition(input, { previewItemsFrom: 4 })
		const totals = computeBuildStats(input)

		expect(
			composition.armor.filter(({ preview }) => preview).map((p) => p.label),
		).toEqual(["Thornmail"])
		expect(sum(composition.armor)).toBeCloseTo(totals.armor.total, 9)
	})

	test("previewed stat shards are flagged", async () => {
		const composition = statComposition(await inputOf(LUX), {
			previewShards: true,
		})

		expect(
			composition.abilityPower.find(({ kind }) => kind === "shards"),
		).toMatchObject({ preview: true })
	})

	test("Lux's ability power credits Magical Opus with 30% of her flat ability power", async () => {
		const { abilityPower } = statComposition(await inputOf(LUX))
		const flat = sum(abilityPower.filter(({ kind }) => kind !== "effect"))
		const effects = abilityPower.filter(({ kind }) => kind === "effect")

		expect(effects).toHaveLength(1)
		expect(effects[0]?.value).toBeCloseTo(0.3 * flat)
	})

	test("Veigar's stacks are his passive's ability power, before Rabadon's", async () => {
		const { abilityPower } = statComposition(await inputOf(VEIGAR))
		const passive = abilityPower.find(({ label }) =>
			label.startsWith("Phenomenal Evil"),
		)

		expect(passive?.value).toBeGreaterThanOrEqual(200)
	})

	test("a form's fixed stats and its always-on effects are the form's parts; a switch in that form is an effect", async () => {
		const gnar = statComposition(
			await inputOf({
				championKey: "Gnar",
				level: 13,
				itemIds: [],
				shardIds: [],
				ranks: { Q: 3, W: 3, E: 3, R: 2 },
				form: "mega",
			}),
		)
		const rockets = statComposition(await inputOf({ ...JINX, form: "rockets" }))

		expect(gnar.health.find(({ kind }) => kind === "form")?.label).toBe(
			"Mega Gnar",
		)
		expect(
			rockets.attackRange.find(({ kind }) => kind === "form")?.value,
		).toBeGreaterThan(0)
		expect(
			statComposition(await inputOf(JINX)).attackSpeed.find(({ label }) =>
				label.endsWith("Rev'd up"),
			)?.kind,
		).toBe("effect")
	})

	test("an effect turned off has no part, even one that reads a rank stat", async () => {
		const teemo = {
			championKey: "Teemo",
			level: 5,
			itemIds: [],
			shardIds: [],
			ranks: { Q: 2, W: 2, E: 1, R: 0 },
		}
		const off = statComposition(
			await inputOf({ ...teemo, overrides: { "teemo-w-passive": false } }),
		)
		const on = statComposition(await inputOf(teemo))

		expect(off.movementSpeed.map(({ kind }) => kind)).toEqual(["base"])
		expect(on.movementSpeed.find(({ kind }) => kind === "effect")).toBeDefined()
		expect(on.movementSpeed.some(({ kind }) => kind === "ranks")).toBe(false)
	})
})
