import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import {
	type SummonerSpell,
	summonerSpellsFileSchema,
} from "@schemas/summoner-spell"
import { combatEffects } from "../effects/available-effects"
import { SMITE_KEY } from "../smite-upgrade"
import type { CombatEvent, DealtDamage } from "./combat"
import { simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-11).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function patchFile(file: string): Promise<unknown> {
	return Bun.file(new URL(`${PATCH}/${file}`, DATA)).json()
}

const RENGAR: Champion = championSchema.parse(
	await patchFile("champions/Rengar.json"),
)
const SPELLS = summonerSpellsFileSchema.parse(
	await patchFile("summoner-spells.json"),
).spells

function spell(key: string): SummonerSpell {
	const found = SPELLS.find((entry) => entry.key === key)
	if (!found) throw new Error(`${key} is not in the current patch`)
	return found
}

type Hit = Extract<CombatEvent, { damage: DealtDamage }>

function simulateSpell(key: string, upgradedSpells: readonly string[] = []) {
	const ranks = { Q: 1, W: 0, E: 0, R: 0 }
	const summoners = [spell(key)]
	return simulateCombat({
		build: {
			champion: RENGAR,
			patch: PATCH,
			level: 6,
			items: [],
			shards: [],
			ranks,
		},
		effects: combatEffects({
			patch: PATCH,
			champion: RENGAR,
			ranks,
			spells: summoners,
			upgradedSpells,
			runes: [],
			items: [],
		}),
		summoners,
		upgradedSpells,
		target: { health: 1800, armor: 70, magicResist: 50, level: 9 },
		actions: [{ kind: "summoner", slot: 0 }],
	})
}

describe("Smite against a champion", () => {
	test("base Smite is refused: it can't target champions", () => {
		const [step] = simulateSpell(SMITE_KEY).steps

		expect(step?.refused).toContain("only once upgraded")
	})

	// Wiki Smite: "Can be cast on enemy champions or pets to deal 40 true damage and slow the target by 20% for 2 seconds."
	test("upgraded, it deals 40 true damage and slows the target 20% for 2 s", () => {
		const [step] = simulateSpell(SMITE_KEY, [SMITE_KEY]).steps
		const hits = (step?.events ?? []).filter(
			(event): event is Hit => event.kind === "hit" && "damage" in event,
		)

		expect(hits.map(({ damage }) => [damage.type, damage.final])).toEqual([
			["true", 40],
		])
		expect(step?.active).toMatchObject([
			{
				effectId: "smite-champion",
				holder: "target",
				endsAt: 2,
				debuffs: [{ kind: "slow", percent: 20 }],
			},
		])
	})
})

// Wiki Exhaust: "slowing them by 40% and reducing their damage dealt by 35%" for 3 seconds.
test("Exhaust lists its slow and damage reduction on the target for 3 s, dealing nothing", () => {
	const result = simulateSpell("SummonerExhaust")

	expect(result.total.final).toBe(0)
	expect(result.steps[0]?.active).toMatchObject([
		{
			effectId: "exhaust",
			holder: "target",
			endsAt: 3,
			debuffs: [
				{ kind: "slow", percent: 40 },
				{ kind: "damageDealtReduction", percent: 35 },
			],
		},
	])
})
