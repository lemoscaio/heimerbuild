import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "../effects/effect"
import { ABILITY_EFFECTS } from "../effects/registries/ability-effects"
import { ITEM_EFFECTS } from "../effects/registries/item-effects"
import { RUNE_EFFECTS } from "../effects/registries/rune-effects"
import {
	dropUnusedComboStart,
	hasStartCooldown,
	startCooldownEffects,
} from "./start-cooldowns"

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
	test("rune and item procs with a cooldown, Hail of Blades and Grasp included", () => {
		for (const id of [
			"electrocute",
			"press-the-attack",
			"summon-aery",
			"arcane-comet",
			"first-strike",
			"dark-harvest",
			"hail-of-blades",
			"grasp-of-the-undying-proc",
			"sheen-spellblade",
		]) {
			expect(hasStartCooldown(registered(id))).toBe(true)
		}
	})

	test("not an effect without a cooldown: Kraken Slayer's third hit, Guinsoo's stacks, Conqueror", () => {
		for (const id of [
			"kraken-slayer-bring-it-down",
			"guinsoos-rageblade-wrath",
			"conqueror",
			"electrocute-stacks",
		]) {
			expect(hasStartCooldown(registered(id))).toBe(false)
		}
	})

	test("not a periodic passive, which keeps its start marker (Valor, Short Fuse)", () => {
		expect(hasStartCooldown(registered("quinn-harrier-valor"))).toBe(false)
		expect(hasStartCooldown(registered("ziggs-short-fuse"))).toBe(false)
	})
})

describe("startCooldownEffects", () => {
	test("follows the build: Electrocute's chip goes when Conqueror replaces it", () => {
		const electrocute = [bound("electrocute-stacks"), bound("electrocute")]
		const conqueror = [bound("conqueror")]

		expect(
			startCooldownEffects(electrocute, undefined).map(({ id }) => id),
		).toEqual(["electrocute"])
		expect(startCooldownEffects(conqueror, undefined)).toEqual([])
	})

	test("lists an effect once, and only in the form it holds in", () => {
		const effects = [
			bound("hail-of-blades"),
			bound("hail-of-blades"),
			bound("electrocute", { form: "dragon" }),
		]

		expect(
			startCooldownEffects(effects, undefined).map(({ id }) => id),
		).toEqual(["hail-of-blades"])
		expect(startCooldownEffects(effects, "dragon")).toHaveLength(2)
	})
})

describe("dropUnusedComboStart", () => {
	test("drops the effects the build no longer has; none left means no value", () => {
		const effects = [bound("electrocute")]

		expect(dropUnusedComboStart("-electrocute.-hail-of-blades", effects)).toBe(
			"-electrocute",
		)
		expect(dropUnusedComboStart("-hail-of-blades", effects)).toBeUndefined()
	})

	test("keeps the value as given while the effects load", () => {
		expect(dropUnusedComboStart("-hail-of-blades", undefined)).toBe(
			"-hail-of-blades",
		)
	})
})
