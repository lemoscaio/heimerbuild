import { useState } from "react"
import type { SummonerSlot } from "@/lib/summoner-slots"
import type { Summoners } from "./use-summoners"

/** One slot's picker: open state, and a pick or clear that also closes it. */
export function useSlotPicker(summoners: Summoners, slot: SummonerSlot) {
	const [open, setOpen] = useState(false)

	return {
		open,
		setOpen,
		pick(spellId: string) {
			summoners.pick(slot, spellId)
			setOpen(false)
		},
		clear() {
			summoners.clear(slot)
			setOpen(false)
		},
	}
}
