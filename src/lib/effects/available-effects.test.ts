import { describe, expect, test } from "bun:test"
import {
	assertValidPatchRange,
	type PatchRange,
	patchRangesOverlap,
} from "@schemas/patch-range"
import type { Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"
import {
	availableEffects,
	combatEffects,
	EFFECT_REGISTRIES,
	type EffectsBuild,
} from "./available-effects"
import type { Effect } from "./effect"

const PATCH = "16.19.1"

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
	patch: PATCH,
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

	test("binds an effect bound to a form to that form's name", () => {
		const dragonForm: Effect = {
			id: "dragon-form",
			source: { kind: "ability", championKey: "Teemo", slot: "W" },
			form: "dragon",
			trigger: { kind: "always" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/Shyvana",
		}
		const champion = {
			...build.champion,
			forms: [
				{ id: "human", name: "Human" },
				{ id: "dragon", name: "Dragon" },
			],
		}
		const [bound] = availableEffects({ ...build, champion }, [[dragonForm]])

		expect(bound?.formName).toBe("Dragon")
	})

	test("an effect bound to a form reads the ability that form has in its slot", () => {
		const cannonOnly: Effect = {
			id: "cannon-only",
			source: { kind: "ability", championKey: "Teemo", slot: "W" },
			form: "cannon",
			trigger: { kind: "always" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/Jayce",
		}
		const hyperCharge = {
			slot: "W" as const,
			name: "Hyper Charge",
			icon: "jayce-w-cannon.png",
			rankValues: [{ label: "Cooldown", values: [13, 11.4] }],
		}
		const champion = {
			...build.champion,
			abilities: {
				...build.champion.abilities,
				forms: { cannon: { W: hyperCharge } },
			},
		}

		const [bound] = availableEffects({ ...build, champion }, [[cannonOnly]])
		const [unbound] = availableEffects({ ...build, champion }, [
			[{ ...cannonOnly, form: undefined }],
		])

		expect(bound).toMatchObject({
			name: "Hyper Charge",
			icon: "jayce-w-cannon.png",
			rankValues: hyperCharge.rankValues,
		})
		expect(unbound?.name).toBe("Move Quick")
	})

	test("an effect any summoner spell triggers needs a chosen spell", () => {
		expect(ids(availableEffects({ ...build, spells: [] }))).toEqual([
			"teemo-w-passive",
			"teemo-w-active",
		])
	})
})

describe("availableEffects by patch", () => {
	const ghostSource = { kind: "summoner", spellKey: "SummonerHaste" } as const
	function ghostVersion(range: PatchRange, amount: number): Effect {
		return {
			id: "ghost",
			...range,
			source: ghostSource,
			trigger: { kind: "after-use" },
			grants: [{ kind: "stat", stat: "movementSpeedPercent", amount }],
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/Ghost",
		}
	}
	const old = ghostVersion({ since: "16.19", until: "16.20" }, 0.2)
	const current = ghostVersion({ since: "16.21" }, 0.3)
	const registries = [[old, current]]

	function effectsOn(patch: string) {
		return availableEffects({ ...build, patch }, registries).map(
			({ effect }) => effect,
		)
	}

	test("a build gets the version in force on its patch", () => {
		expect(effectsOn("16.19.1")).toEqual([old])
		expect(effectsOn("16.20.4")).toEqual([old])
		expect(effectsOn("16.21.1")).toEqual([current])
	})

	test("an effect stops applying after its until", () => {
		expect(effectsOn("16.21.1")).not.toContain(old)
	})

	test("an effect does not apply before its since", () => {
		expect(effectsOn("16.18.1")).toEqual([])
		expect(effectsOn("16.20.1")).not.toContain(current)
	})
})

describe("the registries", () => {
	const effects: Effect[] = EFFECT_REGISTRIES.flat()

	test("every effect has a link-safe id, a valid patch range and a source page", () => {
		for (const effect of effects) {
			expect(effect.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
			expect(effect.sourceUrl).toMatch(/^https:\/\//)
			expect(() => assertValidPatchRange(effect)).not.toThrow()
		}
	})

	test("versions of one effect never overlap, so a patch has one at most", () => {
		for (const [index, effect] of effects.entries()) {
			const overlapping = effects
				.slice(index + 1)
				.filter(
					(other) =>
						other.id === effect.id && patchRangesOverlap(effect, other),
				)
			expect(overlapping).toEqual([])
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

describe("combatEffects", () => {
	const quinn: EffectsBuild = {
		...build,
		champion: {
			key: "Quinn",
			abilities: {
				passive: { name: "Harrier", icon: "harrier.png" },
				spells: [{ slot: "W", name: "Heightened Senses", icon: "w.png" }],
			},
		},
		spells: [spell("SummonerDot", "Ignite")],
		runes: [],
		items: [{ id: "3078", name: "Trinity Force", icon: "trinity.png" }],
	}

	test("binds a passive's effects, the chosen items' and the target's, which the stats panel leaves out", () => {
		expect(ids(combatEffects(quinn))).toEqual([
			"quinn-harrier-mark",
			"quinn-harrier",
			"quinn-w-passive",
			"ignite",
			"trinity-force-spellblade",
		])
		expect(ids(availableEffects(quinn))).toEqual([])
	})

	test("a passive's effect is named after the passive", () => {
		const [harrier] = combatEffects(quinn)

		expect(harrier).toMatchObject({ name: "Harrier", icon: "harrier.png" })
		expect(harrier?.slot).toBeUndefined()
	})
})
