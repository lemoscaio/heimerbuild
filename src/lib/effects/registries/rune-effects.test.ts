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
