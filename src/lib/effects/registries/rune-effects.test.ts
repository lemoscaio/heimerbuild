import { describe, expect, test } from "bun:test"
import { type Rune, runesFileSchema } from "@schemas/rune"
import heimerBin from "../../../../scripts/sync-data/fixtures/champions/Heimerdinger.bin.json"
import heimerDetail from "../../../../scripts/sync-data/fixtures/champions/Heimerdinger.json"
import teemoBin from "../../../../scripts/sync-data/fixtures/champions/Teemo.bin.json"
import teemoDetail from "../../../../scripts/sync-data/fixtures/champions/Teemo.json"
import perks from "../../../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../../../scripts/sync-data/fixtures/runes/runesReforged.json"
import sharedBin from "../../../../scripts/sync-data/fixtures/summoners/shared.bin.json"
import summonerJson from "../../../../scripts/sync-data/fixtures/summoners/summoner.json"
import { normalizeChampion } from "../../../../scripts/sync-data/normalize-champions"
import { normalizeRunes } from "../../../../scripts/sync-data/normalize-runes"
import { normalizeSummonerSpells } from "../../../../scripts/sync-data/normalize-summoner-spells"
import { computeBuildStats } from "../../stats/compute-build-stats"
import type { ItemInput } from "../../stats/compute-stats"
import { softCapMovementSpeed } from "../../stats/movement-speed"
import { availableEffects } from "../available-effects"
import { resolveGrants } from "../evaluate"
import { RUNE_EFFECTS } from "./rune-effects"

const PATCH = "16.19.1"

const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")
const { spells } = normalizeSummonerSpells(summonerJson, sharedBin, "16.19.1")
function findRune(key: string): Rune {
	const found = runes.trees
		.flatMap((tree) => tree.rows.flat())
		.find((rune) => rune.key === key)
	if (!found) throw new Error(`No rune ${key} in the fixture`)
	return found
}

const nimbusCloak = findRune("NimbusCloak")

function nimbusSpeedAfter(name: string) {
	const spell = spells.find((entry) => entry.name === name)
	const [effect] = availableEffects({
		patch: PATCH,
		champion: { key: "Teemo", abilities: { spells: [] } },
		ranks: { Q: 0, W: 0, E: 0, R: 0 },
		spells: spell ? [spell] : [],
		runes: [nimbusCloak],
	}).filter(({ effect }) => effect.id === "nimbus-cloak")
	return effect && resolveGrants(effect, { level: 1 })[0]?.value
}

describe("Nimbus Cloak", () => {
	test("the brackets span the rune text's range", () => {
		const text = nimbusCloak.longDescription.flat(2).map(({ text }) => text)
		const [nimbus] = RUNE_EFFECTS
		const grant = nimbus?.grants[0]
		const brackets =
			grant?.kind === "stat" &&
			typeof grant.amount === "object" &&
			grant.amount.by === "summonerCooldown"
				? grant.amount.brackets
				: []

		expect(text.join(" ")).toContain("15% - 45% Move Speed")
		expect(brackets.at(0)?.value).toBe(0.15)
		expect(brackets.at(-1)?.value).toBe(0.45)
	})

	// Wiki brackets on the Rift: under 100 s, 100 to 250 s, 250 s and more.
	test("gives 45% after a 300 s spell, 35% after a 180 to 240 s one, 15% after Smite", () => {
		expect(nimbusSpeedAfter("Flash")).toBe(0.45)
		expect(nimbusSpeedAfter("Teleport")).toBe(0.45)
		for (const name of ["Ghost", "Heal", "Barrier", "Ignite", "Exhaust"]) {
			expect(nimbusSpeedAfter(name)).toBe(0.35)
		}
		expect(nimbusSpeedAfter("Cleanse")).toBe(0.35)
		expect(nimbusSpeedAfter("Smite")).toBe(0.15)
	})
})

describe("Nimbus Cloak with Heal", () => {
	test("their percent movement speed adds up, then the soft caps apply", () => {
		const teemo = normalizeChampion(teemoDetail, teemoBin, "16.19.1")
		const heal = spells.find(({ name }) => name === "Heal")
		const ranks = { Q: 0, W: 0, E: 0, R: 0 }
		const available = availableEffects({
			patch: PATCH,
			champion: teemo,
			ranks,
			spells: heal ? [heal] : [],
			runes: [nimbusCloak],
		})
		const build = {
			champion: teemo,
			patch: PATCH,
			level: 1,
			items: [],
			shards: [],
			ranks,
		}

		const stats = computeBuildStats({
			...build,
			effects: {
				available,
				overrides: { heal: true, "nimbus-cloak-heal": true },
			},
		})

		expect(available.map(({ id }) => id)).toEqual(["heal", "nimbus-cloak-heal"])
		expect(stats.movementSpeed.total).toBeCloseTo(
			softCapMovementSpeed(
				teemo.stats.movementSpeed.base * (1 + 0.3 + 0.35),
				PATCH,
			),
		)
	})
})

/** A rune as the current patch's data serves it (public/data). */
async function currentRune(key: string): Promise<Rune> {
	const { currentPatch } = await Bun.file(
		new URL("../../../../public/data/manifest.json", import.meta.url),
	).json()
	const { trees } = runesFileSchema.parse(
		await Bun.file(
			new URL(
				`../../../../public/data/${currentPatch}/runes.json`,
				import.meta.url,
			),
		).json(),
	)
	const found = trees
		.flatMap((tree) => [tree.keystones, ...tree.rows].flat())
		.find((rune) => rune.key === key)
	if (!found) throw new Error(`No rune ${key} in the current patch`)
	return found
}

function stormAt(
	gameTime: number,
	adaptiveType: "ad" | "ap" = "ap",
	rune: Rune = findRune("GatheringStorm"),
) {
	const [storm] = availableEffects({
		patch: PATCH,
		champion: { key: "Teemo", abilities: { spells: [] } },
		ranks: { Q: 0, W: 0, E: 0, R: 0 },
		spells: [],
		runes: [rune],
	})
	return storm && resolveGrants(storm, { level: 1, gameTime, adaptiveType })[0]
}

describe("Gathering Storm", () => {
	test("matches every step the current patch's rune text lists, AP and rounded AD", async () => {
		const rune = await currentRune("GatheringStorm")
		const lines = rune.longDescription
			.flat()
			.map((line) => line.map(({ text }) => text).join(""))
		const steps = lines.flatMap((line) => {
			const match = /^(\d+) min: \+ (\d+) AP or (\d+) AD$/.exec(line)
			return match ? [match.slice(1).map(Number)] : []
		})

		expect(steps.map(([minutes]) => minutes)).toEqual([10, 20, 30, 40, 50, 60])
		for (const [minutes = 0, ap, ad] of steps) {
			expect(stormAt(minutes, "ap", rune)?.value).toBe(ap)
			expect(Math.round(stormAt(minutes, "ad", rune)?.value ?? 0)).toBe(ad)
		}
	})

	// Wiki: 0 / 8 / 24 / 48 / 80 / 120 / 168 / 224 AP or 0 / 4.8 / 14.4 / 28.8… AD, no cap.
	test("grows every 10 minutes with no cap, as AP or AD", () => {
		expect(stormAt(0)).toEqual({ kind: "stat", stat: "abilityPower", value: 0 })
		expect(stormAt(19)?.value).toBe(8)
		expect(stormAt(70)?.value).toBe(224)
		expect(stormAt(120)?.value).toBe(624)
		expect(stormAt(30, "ad")).toEqual({
			kind: "stat",
			stat: "attackDamage",
			value: expect.closeTo(28.8),
		})
	})

	test("follows the build's adaptive type like the stat shards: AD items make it AD", () => {
		const heimerdinger = normalizeChampion(heimerDetail, heimerBin, "16.19.1")
		const ranks = { Q: 0, W: 0, E: 0, R: 0 }
		const available = availableEffects({
			patch: PATCH,
			champion: heimerdinger,
			ranks,
			spells: [],
			runes: [findRune("GatheringStorm")],
		})
		const build = {
			champion: heimerdinger,
			patch: PATCH,
			level: 1,
			shards: [],
			ranks,
			effects: { available, overrides: {} },
		}
		const longSword = { stats: { attackDamage: 10 } }
		const at = (gameTime: number, items: readonly ItemInput[] = []) =>
			computeBuildStats({ ...build, items, gameTime })

		expect(heimerdinger.adaptiveType).toBe("ap")
		expect(at(30).abilityPower.total - at(0).abilityPower.total).toBe(48)
		expect(
			at(30, [longSword]).attackDamage.total -
				at(0, [longSword]).attackDamage.total,
		).toBeCloseTo(28.8)
		expect(at(30, [longSword]).abilityPower.total).toBe(
			at(0, [longSword]).abilityPower.total,
		)
	})
})

describe("Hail of Blades", () => {
	const effect = RUNE_EFFECTS.find(({ id }) => id === "hail-of-blades")

	test("matches the current patch's rune text: speed by attack type, damage, attacks and cooldown", async () => {
		const rune = await currentRune("HailOfBlades")
		const text = rune.longDescription
			.flat(2)
			.map(({ text }) => text)
			.join(" ")

		expect(text).toContain(
			"Gain 90% (60% for ranged champions) Attack Speed and bonus true damage when you attack an enemy champion for up to 3 attacks.",
		)
		expect(text).toContain("No more than 3s can elapse between attacks")
		expect(text).toContain("Cooldown: 10s.")
		expect(text).toContain(
			"On-Hit Damage: 2 - 20 (+0.12 bonus AD, +0.1 AP) damage.",
		)
		expect(effect).toMatchObject({ charges: 3, duration: 3, cooldown: 10 })
	})

	// Wiki: 2 + (20 − 2) / 17 × (level − 1) true damage (+ 12% bonus AD) (+ 10% AP).
	test("its true damage grows evenly from 2 at level 1 to 20 at level 18", () => {
		const grant = effect?.grants.find(({ kind }) => kind === "onAttackDamage")
		const base =
			grant?.kind === "onAttackDamage" &&
			typeof grant.base === "object" &&
			"by" in grant.base &&
			grant.base.by === "championLevel"
				? grant.base.steps
				: []

		expect(base.map(({ value }) => value).at(0)).toBe(2)
		expect(base.find(({ from }) => from === 9)?.value).toBeCloseTo(
			2 + (18 / 17) * 8,
		)
		expect(base.map(({ value }) => value).at(-1)).toBeCloseTo(20)
		expect(grant).toMatchObject({
			damageType: "true",
			ratios: { bonusAttackDamage: 0.12, abilityPower: 0.1 },
		})
	})
})

/** A rune's long description as one line of text, single spaced. */
function runeText(rune: Rune) {
	return rune.longDescription
		.flat(2)
		.map(({ text }) => text)
		.join(" ")
		.replace(/\s+/g, " ")
}

/** A `damage` grant's base by champion level, as values from level 1 to 18. */
function damageSteps(id: string) {
	const grant = RUNE_EFFECTS.find((effect) => effect.id === id)?.grants.find(
		({ kind }) => kind === "damage",
	)
	const [base] = grant?.kind === "damage" ? [grant.base ?? 0].flat() : []
	return typeof base === "object" && base.by === "championLevel"
		? base.steps.map(({ value }) => value)
		: []
}

// Wiki, checked 2026-10-08 (issue 417).
describe("Electrocute", () => {
	test("matches the current patch's rune text: 3 hits within 3 s, its damage and cooldown", async () => {
		const text = runeText(await currentRune("Electrocute"))
		const stacks = RUNE_EFFECTS.find(({ id }) => id === "electrocute-stacks")

		expect(text).toContain("3 separate attacks or abilities within 3s")
		expect(text).toContain("70 - 240 (+0.1 bonus AD, +0.05 AP)")
		expect(text).toContain("Cooldown: 20s")
		expect(stacks).toMatchObject({ duration: 3, stacks: { max: 3 } })
		expect(RUNE_EFFECTS.find(({ id }) => id === "electrocute")).toMatchObject({
			cooldown: 20,
			delay: { seconds: 0.25 },
		})
	})

	// Wiki: 60 + 10 × level.
	test("its damage grows by 10 a level, 70 at level 1 to 240 at 18", () => {
		const steps = damageSteps("electrocute")

		expect(steps).toHaveLength(18)
		expect(steps[0]).toBe(70)
		expect(steps[8]).toBeCloseTo(150)
		expect(steps[17]).toBeCloseTo(240)
	})
})

describe("Press the Attack", () => {
	test("matches the current patch's rune text: 3 attacks, 40 - 160 adaptive damage, 8% more", async () => {
		const text = runeText(await currentRune("PressTheAttack"))

		expect(text).toContain(
			"3 consecutive basic attacks deals 40 - 160 bonus adaptive damage",
		)
		expect(text).toContain("amplifies your damage dealt by 8%")
	})

	// Wiki: 40 + (160 − 40) / 17 × (level − 1).
	test("its damage grows evenly from 40 at level 1 to 160 at 18", () => {
		const steps = damageSteps("press-the-attack")

		expect(steps[0]).toBe(40)
		expect(steps[8]).toBeCloseTo(40 + (120 / 17) * 8)
		expect(steps[17]).toBeCloseTo(160)
	})
})

describe("Conqueror", () => {
	test("matches the current patch's rune text: 2 stacks for 5 s, 1.8 - 4 adaptive force each, up to 12", async () => {
		const text = runeText(await currentRune("Conqueror"))
		const conqueror = RUNE_EFFECTS.find(({ id }) => id === "conqueror")
		const grant = conqueror?.grants[0]
		const steps =
			grant?.kind === "stat" &&
			typeof grant.amount === "object" &&
			grant.amount.by === "championLevel"
				? grant.amount.steps.map(({ value }) => value / 12)
				: []

		expect(text).toContain("grant 2 stacks of Conqueror for 5s")
		expect(text).toContain("1.8-4 Adaptive Force per stack. Stacks up to 12")
		expect(text).toContain(
			"Ranged champions gain only 1 stack per basic attack",
		)
		expect(conqueror).toMatchObject({ duration: 5, stacks: { max: 12 } })
		expect(steps[0]).toBeCloseTo(1.8)
		expect(steps[17]).toBeCloseTo(4)
	})
})

describe("Lethal Tempo", () => {
	// The rune text's ranged 4% and 6 - 24 differ from the wiki's 4.8% and 6 to 20 (wiki notes).
	test("matches the current patch's rune text for melee: 6% a stack for 6 s, up to 6, a 9 - 30 bolt", async () => {
		const text = runeText(await currentRune("LethalTempo"))

		expect(text).toContain(
			"[6% Melee || 4% Ranged] Attack Speed for 6 seconds, up to 6",
		)
		expect(text).toContain(
			"[9 - 30 Melee || 6 - 24 Ranged] bonus adaptive damage",
		)
		expect(text).toContain("increased by 1% per 1% Bonus Attack Speed")
		expect(RUNE_EFFECTS.find(({ id }) => id === "lethal-tempo")).toMatchObject({
			duration: 6,
			stacks: { max: 6 },
		})
	})
})

describe("the proc keystones match the current patch's rune text", () => {
	test("Summon Aery: 10 - 50 by level (+0.05 AP) (+0.1 bonus AD)", async () => {
		const text = runeText(await currentRune("SummonAery"))

		expect(text).toContain(
			"dealing 10 - 50 based on level (+0.05 AP) (+0.1 bonus AD)",
		)
		expect(damageSteps("summon-aery").at(-1)).toBeCloseTo(50)
	})

	test("Arcane Comet: 15 - 100 by level, cooldown 20 - 8 s", async () => {
		const text = runeText(await currentRune("ArcaneComet"))
		const comet = RUNE_EFFECTS.find(({ id }) => id === "arcane-comet")
		const cooldown =
			typeof comet?.cooldown === "object" &&
			comet.cooldown.by === "championLevel"
				? comet.cooldown.steps.map(({ value }) => value)
				: []

		expect(text).toContain(
			"15 - 100 based on level (+0.05 AP and +0.1 bonus AD)",
		)
		expect(text).toContain("Cooldown: 20 - 8s")
		expect(damageSteps("arcane-comet")[0]).toBe(15)
		expect(cooldown[0]).toBe(20)
		expect(cooldown.at(-1)).toBeCloseTo(8)
	})

	test("First Strike: 7% extra damage for 3 seconds, cooldown 25 - 15 s", async () => {
		const text = runeText(await currentRune("FirstStrike"))

		expect(text).toContain(
			"First Strike for 3 seconds, causing you to deal 7% extra damage",
		)
		expect(text).toContain("Cooldown: 25 - 15s")
	})

	test("Dark Harvest: 30 (+11 per soul) below 50% health, cooldown 35 s", async () => {
		const text = runeText(await currentRune("DarkHarvest"))

		expect(text).toContain("Damaging a Champion below 50% health")
		expect(text).toContain(
			"30 (+11 damage per soul) (+0.1 bonus AD) (+0.05 AP)",
		)
		expect(text).toContain("Cooldown: 35s")
		expect(RUNE_EFFECTS.find(({ id }) => id === "dark-harvest")).toMatchObject({
			cooldown: 35,
		})
	})

	test("Grasp of the Undying: every 4 s, 3.5% of maximum health, 40% for ranged", async () => {
		const text = runeText(await currentRune("GraspOfTheUndying"))

		expect(text).toContain("Every 4s in combat")
		expect(text).toContain("magic damage equal to 3.5% of your max health")
		expect(text).toContain("are 40% effective")
		expect(
			RUNE_EFFECTS.find(({ id }) => id === "grasp-of-the-undying-proc"),
		).toMatchObject({ cooldown: 4 })
	})
})

// Wiki, checked 2026-10-08 (issue 409). Each rune's stacks are the build's match stacks.
describe("runes with match stacks", () => {
	const teemo = normalizeChampion(teemoDetail, teemoBin, "16.19.1")
	const ranks = { Q: 0, W: 0, E: 0, R: 0 }

	/** Teemo's totals at level 9 with `rune` on the page and `matchStacks`. */
	async function statsWith(key: string, matchStacks?: Record<string, number>) {
		const rune = await currentRune(key)
		const available = availableEffects({
			patch: PATCH,
			champion: teemo,
			ranks,
			spells: [],
			runes: [rune],
		})
		return computeBuildStats({
			champion: teemo,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks,
			effects: { available, overrides: {} },
			matchStacks,
		})
	}

	test("Legend: Alacrity gives 3% attack speed and 1.5% more per stack, up to 10", async () => {
		const bonus = async (count?: number) =>
			(
				await statsWith(
					"LegendAlacrity",
					count === undefined ? undefined : { "legend-alacrity-stacks": count },
				)
			).attackSpeed.bonus
		const none = (await statsWith("NimbusCloak")).attackSpeed.bonus

		expect((await bonus()) - none).toBeCloseTo(
			0.03 * teemo.stats.attackSpeed.ratio,
		)
		expect((await bonus(10)) - none).toBeCloseTo(
			0.18 * teemo.stats.attackSpeed.ratio,
		)
		expect(await bonus(40)).toBeCloseTo(await bonus(10))
	})

	test("Legend: Bloodline gives 0.45% life steal per stack, and 85 health at its 15", async () => {
		const at = (count: number) =>
			statsWith("LegendBloodline", { "legend-bloodline-stacks": count })
		const none = await statsWith("LegendBloodline")

		expect((await at(14)).lifeStealPercent.total).toBeCloseTo(0.063)
		expect((await at(14)).health.total).toBe(none.health.total)
		expect((await at(15)).lifeStealPercent.total).toBeCloseTo(0.0675)
		expect((await at(15)).health.total - none.health.total).toBe(85)
	})

	test("Overgrowth gives 3 health per stack, and 3.5% more health from 15", async () => {
		const health = async (count?: number) =>
			(
				await statsWith(
					"Overgrowth",
					count === undefined ? undefined : { "overgrowth-stacks": count },
				)
			).health.total
		const none = await health()

		expect((await health(14)) - none).toBe(42)
		expect(await health(15)).toBeCloseTo((none + 45) * 1.035)
	})

	test("Manaflow Band gives 25 mana per stack, up to 250", async () => {
		const mana = async (count?: number) =>
			(
				await statsWith(
					"ManaflowBand",
					count === undefined ? undefined : { "manaflow-band-stacks": count },
				)
			).mana.total
		const none = await mana()

		expect((await mana(4)) - none).toBe(100)
		expect((await mana(12)) - none).toBe(250)
	})

	test("Grasp of the Undying gives 5 health per proc, 2 for a ranged champion", async () => {
		const grasp = RUNE_EFFECTS.find(({ id }) => id === "grasp-of-the-undying")
		if (!grasp) throw new Error("No Grasp of the Undying effect")
		const bound = { id: grasp.id, effect: grasp, name: "Grasp", icon: "" }
		const health = (attackType: "melee" | "ranged") =>
			resolveGrants(bound, {
				level: 9,
				attackType,
				matchStacks: { "grasp-stacks": 30 },
			})[0]?.value

		expect(health("melee")).toBe(150)
		expect(health("ranged")).toBe(60)
		expect(
			(await statsWith("GraspOfTheUndying", { "grasp-stacks": 30 })).health
				.total,
		).toBe((await statsWith("GraspOfTheUndying")).health.total + 60)
	})

	test("Dark Harvest lists its souls, the count its damage reads", async () => {
		const rune = await currentRune("DarkHarvest")
		const listed = availableEffects({
			patch: PATCH,
			champion: teemo,
			ranks,
			spells: [],
			runes: [rune],
		})
		const [souls] = listed

		expect(listed.map(({ id }) => id)).toEqual(["dark-harvest-soul-count"])
		expect(
			souls &&
				resolveGrants(souls, {
					level: 9,
					matchStacks: { "dark-harvest-souls": 12 },
				}),
		).toEqual([{ kind: "counter", counter: "souls", value: 12 }])
	})

	test("Biscuit Delivery gives 30 health per biscuit, 3 biscuits at most", async () => {
		const health = async (count?: number) =>
			(
				await statsWith(
					"BiscuitDelivery",
					count === undefined ? undefined : { "biscuit-stacks": count },
				)
			).health.total
		const none = await health()

		expect((await health(2)) - none).toBe(60)
		expect((await health(9)) - none).toBe(90)
	})
})
