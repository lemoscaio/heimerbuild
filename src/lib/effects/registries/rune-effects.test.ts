import { describe, expect, test } from "bun:test"
import type { Rune } from "@schemas/rune"
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
import { softCapMovementSpeed } from "../../stats/movement-speed"
import { availableEffects } from "../available-effects"
import { resolveGrants } from "../evaluate"
import { RUNE_EFFECTS } from "./rune-effects"

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
			champion: teemo,
			ranks,
			spells: heal ? [heal] : [],
			runes: [nimbusCloak],
		})
		const build = { champion: teemo, level: 1, items: [], shards: [], ranks }

		const stats = computeBuildStats({
			...build,
			effects: {
				available,
				overrides: { heal: true, "nimbus-cloak-heal": true },
			},
		})

		expect(available.map(({ id }) => id)).toEqual(["heal", "nimbus-cloak-heal"])
		expect(stats.movementSpeed.total).toBeCloseTo(
			softCapMovementSpeed(teemo.stats.movementSpeed.base * (1 + 0.3 + 0.35)),
		)
	})
})
