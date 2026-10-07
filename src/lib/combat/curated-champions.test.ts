import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { ABILITY_EFFECTS } from "../effects/registries/ability-effects"
import { CURATED_COMBAT_CHAMPIONS } from "./curated-champions"
import {
	ABILITY_HIT_RULES,
	type AbilityHitRule,
} from "./registries/ability-hits"

const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch } = await Bun.file(new URL("manifest.json", DATA)).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(
			new URL(`${currentPatch}/champions/${key}.json`, DATA),
		).json(),
	)
}

describe("CURATED_COMBAT_CHAMPIONS", () => {
	test.each([...CURATED_COMBAT_CHAMPIONS])(
		"%s: the current patch reads every damage formula of the kit",
		async (key) => {
			const { abilities } = await champion(key)
			const damage = [
				abilities.passive.damage ?? [],
				...abilities.spells.map((spell) => spell.damage ?? []),
			].flat()

			expect(damage.length).toBeGreaterThan(0)
			expect(damage.filter(({ notModeled }) => notModeled)).toEqual([])
		},
	)
})

/** The cast deals nothing because an effect of its ability deals one of its damages (Rengar's leap). */
function movesDamageToEffect(
	{ championKey, slot, damage }: AbilityHitRule,
	names: readonly string[],
) {
	return (
		damage === null &&
		ABILITY_EFFECTS.some(
			({ source, grants }) =>
				source.kind === "ability" &&
				source.championKey === championKey &&
				source.slot === slot &&
				grants.some(
					(grant) =>
						grant.kind === "abilityDamage" && names.includes(grant.name),
				),
		)
	)
}

describe("ABILITY_HIT_RULES", () => {
	test.each(
		ABILITY_HIT_RULES.map((rule) => [rule.championKey, rule.slot, rule]),
	)(
		"%s %s names a champion of the list, unless it only offers variants, empowers an attack or moves its damage to an effect, and damages its ability has",
		async (key, slot, rule) => {
			const spell = (await champion(key)).abilities.spells.find(
				(ability) => ability.slot === slot,
			)
			const names = spell?.damage?.map(({ name }) => name) ?? []
			const mechanicsOnly =
				((!!rule.variants || !!rule.empowersAttack) &&
					!rule.damage &&
					!rule.onHit &&
					!rule.notModeled) ||
				movesDamageToEffect(rule, names)

			if (!mechanicsOnly) expect(CURATED_COMBAT_CHAMPIONS).toContain(key)
			const damages = [
				rule.damage ?? [],
				...(rule.variants ?? []).map(({ damage }) => damage ?? []),
			].flat()
			for (const damage of damages) {
				expect(names).toContain(damage)
			}
		},
	)
})
