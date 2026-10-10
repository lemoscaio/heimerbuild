import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "../effects/effect"
import { ABILITY_EFFECTS } from "../effects/registries/ability-effects"
import { ITEM_EFFECTS } from "../effects/registries/item-effects"
import { RUNE_EFFECTS } from "../effects/registries/rune-effects"
import { hasStartCooldown, startCooldownEffects } from "./start-cooldowns"

const EVERY_EFFECT = [...ABILITY_EFFECTS, ...RUNE_EFFECTS, ...ITEM_EFFECTS]

function registered(id: string): Effect {
	const effect = EVERY_EFFECT.find((entry) => entry.id === id)
	if (!effect) throw new Error(`no effect ${id}`)
	return effect
}

function bound(id: string, extra: Partial<Effect> = {}): BuildEffect {
	return {
		id,
		effect: { ...registered(id), ...extra },
		name: id,
		icon: `${id}.png`,
	}
}

describe("which effects the combo's start sets", () => {
	test("rune procs with a cooldown of 3 s or more, Hail of Blades and Grasp (4 s) included", () => {
		for (const id of [
			"electrocute",
			"press-the-attack",
			"arcane-comet",
			"first-strike",
			"dark-harvest",
			"hail-of-blades",
			"grasp-of-the-undying-proc",
		]) {
			expect(hasStartCooldown(bound(id), 9)).toBe(true)
		}
	})

	test("not a cooldown too short to matter at a fight's start: the spellblades (1.5 s), Aery (2.45 s)", () => {
		for (const id of [
			"sheen-spellblade",
			"trinity-force-spellblade",
			"lich-bane-spellblade",
			"summon-aery",
		]) {
			expect(hasStartCooldown(bound(id), 9)).toBe(false)
		}
	})

	test("reads a cooldown that scales with level at the champion's level (Arcane Comet: 20 s to 8 s)", () => {
		expect(hasStartCooldown(bound("arcane-comet"), 1)).toBe(true)
		expect(hasStartCooldown(bound("arcane-comet"), 18)).toBe(true)
		expect(
			hasStartCooldown(
				bound("arcane-comet", {
					cooldown: {
						by: "championLevel",
						steps: [
							{ from: 1, value: 4 },
							{ from: 10, value: 2 },
						],
					},
				}),
				12,
			),
		).toBe(false)
	})

	test("not an effect without a cooldown: Kraken Slayer's third hit, Guinsoo's stacks, Conqueror", () => {
		for (const id of [
			"kraken-slayer-bring-it-down",
			"guinsoos-rageblade-wrath",
			"conqueror",
			"electrocute-stacks",
		]) {
			expect(hasStartCooldown(bound(id), 9)).toBe(false)
		}
	})

	test("not a periodic passive, which keeps its start marker (Valor, Short Fuse)", () => {
		expect(hasStartCooldown(bound("quinn-harrier-valor"), 9)).toBe(false)
		expect(hasStartCooldown(bound("ziggs-short-fuse"), 9)).toBe(false)
	})
})

describe("startCooldownEffects", () => {
	test("follows the build: Electrocute's chip goes when Conqueror replaces it", () => {
		const electrocute = [bound("electrocute-stacks"), bound("electrocute")]
		const conqueror = [bound("conqueror")]

		expect(
			startCooldownEffects(electrocute, undefined, 9).map(({ id }) => id),
		).toEqual(["electrocute"])
		expect(startCooldownEffects(conqueror, undefined, 9)).toEqual([])
	})

	test("lists an effect once, and only in the form it holds in", () => {
		const effects = [
			bound("hail-of-blades"),
			bound("hail-of-blades"),
			bound("electrocute", { form: "dragon" }),
		]

		expect(
			startCooldownEffects(effects, undefined, 9).map(({ id }) => id),
		).toEqual(["hail-of-blades"])
		expect(startCooldownEffects(effects, "dragon", 9)).toHaveLength(2)
	})
})
