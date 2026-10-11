import { expect, test } from "bun:test"
import {
	championTargetBlock,
	SMITE_KEY,
	upgradedSpellKeys,
} from "./smite-upgrade"

const SMITE = { key: SMITE_KEY, name: "Smite" }

// Wiki Smite: base Smite hits monsters, minions and pets; Unleashed and Primal also champions.
test("base Smite can't target a champion; upgraded, it can", () => {
	expect(championTargetBlock(SMITE, upgradedSpellKeys(undefined))).toContain(
		"only once upgraded",
	)
	expect(
		championTargetBlock(SMITE, upgradedSpellKeys("unleashed")),
	).toBeUndefined()
	expect(
		championTargetBlock(SMITE, upgradedSpellKeys("primal")),
	).toBeUndefined()
})

test("every other spell can target a champion", () => {
	expect(
		championTargetBlock({ key: "SummonerExhaust", name: "Exhaust" }, []),
	).toBeUndefined()
})
