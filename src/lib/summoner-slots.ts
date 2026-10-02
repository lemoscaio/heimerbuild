/** The build's two summoner spell slots (D and F in game): a spell id each, `undefined` when empty. */
export type SummonerSlots = readonly [string | undefined, string | undefined]

export type SummonerSlot = 0 | 1

export const EMPTY_SUMMONER_SLOTS: SummonerSlots = [undefined, undefined]

const SEPARATOR = ","

/** Shape of the `summoners` URL value before it is checked against the data. */
export const SUMMONERS_PARAM_PATTERN = /^\d{0,6},\d{0,6}$/

function slotId(value: string | undefined) {
	return value ? value : undefined
}

/** Reads the `summoners` value's two ids; an unreadable value means two empty slots. */
export function parseSummonerSlots(value: string | undefined): SummonerSlots {
	if (!value || !SUMMONERS_PARAM_PATTERN.test(value)) {
		return EMPTY_SUMMONER_SLOTS
	}
	const [first, second] = value.split(SEPARATOR)
	return [slotId(first), slotId(second)]
}

/**
 * Compact URL form `D,F` with Riot's spell ids ("4,14"), an empty slot left blank ("4," or ",14");
 * `undefined` when both are empty. The comma keeps it from ever parsing as JSON (the router would quote it).
 */
export function serializeSummonerSlots(
	slots: SummonerSlots,
): string | undefined {
	if (!slots[0] && !slots[1]) return undefined
	return `${slots[0] ?? ""}${SEPARATOR}${slots[1] ?? ""}`
}
