import type { SummonerSpellsFile } from "@schemas/summoner-spell"
import {
	type SummonerSlot,
	type SummonerSlots,
	serializeSummonerSlots,
} from "@/lib/summoner-slots"
import {
	clearSummonerSlot,
	pickSummonerSpell,
	readSummoners,
	swapSummonerSlots,
} from "../lib/summoner-picks"

type UseSummonersOptions = {
	/** This patch's Summoner's Rift spells; undefined while they load. */
	spells: SummonerSpellsFile | undefined
	/** The two slots as the `summoners` value ("4,14"). */
	value: string | undefined
	onChange: (value: string | undefined) => void
}

export type Summoners = ReturnType<typeof useSummoners>

/** The build's two summoner spells, controlled by `value`: the checked slots and their edits. */
export function useSummoners({ spells, value, onChange }: UseSummonersOptions) {
	const summoners = readSummoners(value, spells)

	function save(slots: SummonerSlots) {
		onChange(serializeSummonerSlots(slots))
	}

	return {
		/** The spell in each slot, checked against this patch; empty while the spells load. */
		slots: summoners.spells,
		/** The checked `summoners` value; the given one while the spells load. */
		value: summoners.value,
		/** The spells a slot can take: this patch's Summoner's Rift spells. */
		available: spells?.spells ?? [],
		pick: (slot: SummonerSlot, spellId: string) =>
			save(pickSummonerSpell(summoners.slots, slot, spellId)),
		swap: () => save(swapSummonerSlots(summoners.slots)),
		clear: (slot: SummonerSlot) =>
			save(clearSummonerSlot(summoners.slots, slot)),
	}
}
