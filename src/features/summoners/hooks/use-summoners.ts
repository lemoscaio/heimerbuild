import type { SummonerSpellsFile } from "@schemas/summoner-spell"
import type { SmiteUpgrade } from "@/lib/smite-upgrade"
import {
	type SummonerSlot,
	type SummonerSlots,
	serializeSummonerSlots,
} from "@/lib/summoner-slots"
import {
	clearSummonerSlot,
	keptSmiteUpgrade,
	pickSummonerSpell,
	readSummoners,
	swapSummonerSlots,
} from "../lib/summoner-picks"

/** The domain's values: the two slots as the `summoners` value ("4,14") and Smite's upgrade. */
export type SummonersValue = {
	summoners: string | undefined
	smiteUpgrade: SmiteUpgrade | undefined
}

type UseSummonersOptions = {
	/** This patch's Summoner's Rift spells; undefined while they load. */
	spells: SummonerSpellsFile | undefined
	value: SummonersValue
	onChange: (value: SummonersValue) => void
}

export type Summoners = ReturnType<typeof useSummoners>

/** The build's two summoner spells and Smite's upgrade, controlled by `value`: the checked slots and their edits. */
export function useSummoners({ spells, value, onChange }: UseSummonersOptions) {
	const summoners = readSummoners(value.summoners, spells)
	const smiteUpgrade = keptSmiteUpgrade(value.smiteUpgrade, summoners)

	function save(slots: SummonerSlots, upgrade: SmiteUpgrade | undefined) {
		const next = readSummoners(serializeSummonerSlots(slots), spells)
		onChange({
			summoners: next.value,
			smiteUpgrade: keptSmiteUpgrade(upgrade, next),
		})
	}

	return {
		/** The spell in each slot, checked against this patch; empty while the spells load. */
		slots: summoners.spells,
		/** The checked `summoners` value; the given one while the spells load. */
		value: summoners.value,
		/** Smite's upgrade, kept only while a slot holds Smite. */
		smiteUpgrade,
		/** The spells a slot can take: this patch's Summoner's Rift spells. */
		available: spells?.spells ?? [],
		pick: (slot: SummonerSlot, spellId: string) =>
			save(pickSummonerSpell(summoners.slots, slot, spellId), smiteUpgrade),
		swap: () => save(swapSummonerSlots(summoners.slots), smiteUpgrade),
		clear: (slot: SummonerSlot) =>
			save(clearSummonerSlot(summoners.slots, slot), smiteUpgrade),
		setSmiteUpgrade: (upgrade: SmiteUpgrade | undefined) =>
			save(summoners.slots, upgrade),
	}
}
