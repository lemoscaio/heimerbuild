import type { SummonerSpell, SummonerSpellsFile } from "@schemas/summoner-spell"
import {
	parseSummonerSlots,
	type SummonerSlot,
	type SummonerSlots,
	serializeSummonerSlots,
} from "@/lib/summoner-slots"

type SlotSpells = readonly [
	SummonerSpell | undefined,
	SummonerSpell | undefined,
]

/**
 * The slots a `summoners` value names, checked against this patch's spells: an unknown spell
 * empties its slot, and a spell already in D leaves F empty. Until the spells load, the value
 * stays as given so an edit elsewhere in the build does not drop it.
 */
export function readSummoners(
	value: string | undefined,
	spells: SummonerSpellsFile | undefined,
) {
	const named = parseSummonerSlots(value)
	if (!spells) {
		return {
			slots: named,
			spells: [undefined, undefined] as SlotSpells,
			value,
		}
	}
	const find = (id: string | undefined) =>
		spells.spells.find((spell) => spell.id === id)
	const first = find(named[0])
	const second = named[1] === first?.id ? undefined : find(named[1])
	const slots: SummonerSlots = [first?.id, second?.id]
	return {
		slots,
		spells: [first, second] as SlotSpells,
		value: serializeSummonerSlots(slots),
	}
}

/** Puts `spellId` in `slot`. A spell already in the other slot swaps places, as in the game's picker. */
export function pickSummonerSpell(
	slots: SummonerSlots,
	slot: SummonerSlot,
	spellId: string,
): SummonerSlots {
	const other = slot === 0 ? 1 : 0
	if (slots[other] === spellId) return swapSummonerSlots(slots)
	return slot === 0 ? [spellId, slots[1]] : [slots[0], spellId]
}

/** Trades the spells of D and F. */
export function swapSummonerSlots([
	first,
	second,
]: SummonerSlots): SummonerSlots {
	return [second, first]
}

export function clearSummonerSlot(
	slots: SummonerSlots,
	slot: SummonerSlot,
): SummonerSlots {
	return slot === 0 ? [undefined, slots[1]] : [slots[0], undefined]
}
