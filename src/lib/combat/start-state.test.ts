import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "../effects/effect"
import { ABILITY_EFFECTS } from "../effects/registries/ability-effects"
import { ITEM_EFFECTS } from "../effects/registries/item-effects"
import { RUNE_EFFECTS } from "../effects/registries/rune-effects"
import { SUMMONER_EFFECTS } from "../effects/registries/summoner-effects"
import {
	dropUnusedComboStart,
	isStartRunningEffect,
	isStartStackEffect,
	startRunningEffects,
	startStackEffects,
} from "./start-state"

const EVERY_EFFECT = [
	...ABILITY_EFFECTS,
	...RUNE_EFFECTS,
	...ITEM_EFFECTS,
	...SUMMONER_EFFECTS,
]
const CURRENT = EVERY_EFFECT.filter(({ until }) => until === undefined)

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

function ids(is: (effect: Effect) => boolean) {
	return [...new Set(CURRENT.filter(is).map(({ id }) => id))].sort()
}

describe("the stacks the combo can start with (issue 317, owner decisions)", () => {
	test("in-fight stacks that change the damage, Conqueror and Black Cleaver's Carve included", () => {
		expect(ids(isStartStackEffect)).toEqual(
			[
				"black-cleaver-carve",
				"conqueror",
				"guinsoos-rageblade-seething-strike",
				"jax-passive",
				"jinx-q-revd-up",
				"lethal-tempo",
				"spear-of-shojin-focused-will",
			].sort(),
		)
	})

	test("not damage over time, grants only at the cap, proc counters, movement speed or match stacks", () => {
		for (const id of [
			"brand-blaze",
			"darius-hemorrhage",
			"twitch-deadly-venom",
			"garen-e-armor-reduction",
			"vi-w-passive",
			"kraken-slayer-stacks",
			"electrocute-stacks",
			"press-the-attack-stacks",
			"gnar-w-hyper",
			"dark-harvest-soul-count",
		]) {
			expect(isStartStackEffect(registered(id))).toBe(false)
		}
	})
})

describe("the buffs the combo can start with running (issue 317, owner decisions)", () => {
	test("a cast's or a summoner spell's buff on the attacker that changes the damage", () => {
		for (const id of [
			"master-yi-r-active",
			"tristana-q-active",
			"vayne-r",
			"udyr-monk-training",
			"twitch-q-active",
		]) {
			expect(isStartRunningEffect(registered(id))).toBe(true)
		}
	})

	test("not movement speed or shields only, an effect on the target, a spellblade or a stacking effect", () => {
		for (const id of [
			"ghost",
			"heal",
			"barrier",
			"nimbus-cloak",
			"teemo-w-active",
			"rengar-r-active",
			"udyr-w-active",
			"ignite",
			"nasus-e",
			"sheen-spellblade",
			"lich-bane-spellblade",
			"conqueror",
			"teemo-w-passive",
		]) {
			expect(isStartRunningEffect(registered(id))).toBe(false)
		}
	})

	test("none of them shares a stacking group, so none can replace another (owner decision 7)", () => {
		const offered = CURRENT.filter(
			(effect) => isStartRunningEffect(effect) || isStartStackEffect(effect),
		)
		expect(offered.filter(({ stacking }) => stacking)).toEqual([])
	})

	test("no id ends in a number, which the link would read as a count", () => {
		const offered = CURRENT.filter(
			(effect) => isStartRunningEffect(effect) || isStartStackEffect(effect),
		)
		expect(offered.filter(({ id }) => /-\d+$/.test(id))).toEqual([])
	})
})

describe("startStackEffects and startRunningEffects", () => {
	test("follow the build and its form, once each", () => {
		const effects = [
			bound("conqueror"),
			bound("conqueror"),
			bound("jinx-q-revd-up"),
			bound("electrocute"),
			bound("master-yi-r-active"),
		]

		expect(startStackEffects(effects, "rockets").map(({ id }) => id)).toEqual([
			"conqueror",
		])
		expect(startStackEffects(effects, "minigun").map(({ id }) => id)).toEqual([
			"conqueror",
			"jinx-q-revd-up",
		])
		expect(startRunningEffects(effects, undefined).map(({ id }) => id)).toEqual(
			["master-yi-r-active"],
		)
	})
})

describe("dropUnusedComboStart", () => {
	test("drops what the build no longer has (Conqueror swapped for Electrocute); none left means no value", () => {
		const electrocute = [bound("electrocute-stacks"), bound("electrocute")]

		expect(
			dropUnusedComboStart(
				"-electrocute.-hail-of-blades.conqueror-12.master-yi-r-active",
				electrocute,
			),
		).toBe("-electrocute")
		expect(dropUnusedComboStart("conqueror-12", electrocute)).toBeUndefined()
	})

	test("a count past the cap is the cap, and an effect the start can't set goes", () => {
		const effects = [bound("conqueror"), bound("ghost"), bound("brand-blaze")]

		expect(
			dropUnusedComboStart("conqueror-40.ghost.brand-blaze-2", effects),
		).toBe("conqueror-12")
	})

	test("keeps the value as given while the effects load", () => {
		expect(
			dropUnusedComboStart("conqueror-40.-hail-of-blades", undefined),
		).toBe("conqueror-40.-hail-of-blades")
	})
})
