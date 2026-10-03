import { describe, expect, test } from "bun:test"
import type { Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"
import {
	availableEffects,
	EFFECT_REGISTRIES,
	type EffectsBuild,
} from "./available-effects"
import type { Effect } from "./effect"

function spell(key: string, name: string): SummonerSpell {
	return {
		id: "0",
		key,
		name,
		icon: `https://ddragon.leagueoflegends.com/cdn/img/${key}.png`,
		cooldown: 240,
		description: name,
		longDescription: [[[{ text: name }]]],
		values: {},
	}
}

const GHOST = spell("SummonerHaste", "Ghost")
const FLASH = spell("SummonerFlash", "Flash")
const NIMBUS: Rune = {
	id: 8275,
	key: "NimbusCloak",
	name: "Nimbus Cloak",
	icon: "https://ddragon.leagueoflegends.com/cdn/img/nimbus.png",
	description: "",
	longDescription: [[[{ text: "Nimbus Cloak" }]]],
}

const build: EffectsBuild = {
	champion: {
		key: "Teemo",
		abilities: {
			spells: [{ slot: "W", name: "Move Quick", icon: "teemo-w.png" }],
		},
	},
	ranks: { Q: 0, W: 1, E: 0, R: 0 },
	spells: [GHOST, FLASH],
	runes: [NIMBUS],
}

function ids(effects: ReturnType<typeof availableEffects>) {
	return effects.map(({ id }) => id)
}

describe("availableEffects", () => {
	test("lists the effects whose source is in the build, items aside", () => {
		expect(ids(availableEffects(build))).toEqual([
			"teemo-w-passive",
			"teemo-w-active",
			"ghost",
			"nimbus-cloak-ghost",
			"nimbus-cloak-flash",
		])
	})

	test("leaves out an unranked ability, another champion's, a spell or rune not chosen", () => {
		expect(
			availableEffects({
				...build,
				ranks: { ...build.ranks, W: 0 },
				spells: [FLASH],
				runes: [],
			}),
		).toEqual([])
		expect(
			ids(
				availableEffects({
					...build,
					champion: { ...build.champion, key: "Quinn" },
				}),
			),
		).not.toContain("teemo-w-passive")
	})

	test("binds each effect to its source's name and icon, and the data its amounts read", () => {
		const [passive, , ghost, nimbusAfterGhost] = availableEffects(build)

		expect(passive).toMatchObject({
			name: "Move Quick",
			icon: "teemo-w.png",
			slot: "W",
		})
		expect(ghost).toMatchObject({ name: "Ghost", spell: GHOST })
		expect(nimbusAfterGhost).toMatchObject({
			name: "Nimbus Cloak",
			icon: NIMBUS.icon,
			spell: GHOST,
		})
	})

	test("an effect any summoner spell triggers needs a chosen spell", () => {
		expect(ids(availableEffects({ ...build, spells: [] }))).toEqual([
			"teemo-w-passive",
			"teemo-w-active",
		])
	})
})

describe("the registries", () => {
	const effects: Effect[] = EFFECT_REGISTRIES.flat()

	test("every effect has a unique, link-safe id and a source page", () => {
		expect(new Set(effects.map(({ id }) => id)).size).toBe(effects.length)
		for (const { id, sourceUrl } of effects) {
			expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
			expect(sourceUrl).toMatch(/^https:\/\//)
		}
	})

	test("a stacking group has one rule, and a replace group distinct priorities", () => {
		const groups = Map.groupBy(
			effects.filter(({ stacking }) => stacking),
			({ stacking }) => stacking?.group,
		)
		for (const group of groups.values()) {
			const rules = new Set(group.map(({ stacking }) => stacking?.rule))
			const priorities = group.flatMap(({ stacking }) =>
				stacking?.rule === "replace" ? [stacking.priority] : [],
			)
			expect(rules.size).toBe(1)
			expect(new Set(priorities).size).toBe(priorities.length)
		}
	})
})
