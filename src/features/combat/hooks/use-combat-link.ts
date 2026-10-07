import { useState } from "react"
import type { ComboLink } from "@/lib/combat/combo-link"
import {
	isSameCombatLink,
	readCombatLink,
	toCombatLink,
} from "../lib/combat-link"
import type { CombatState } from "../lib/combat-state"

type UseCombatLinkOptions = {
	/** The combo's link values. */
	value: ComboLink
	onChange: (value: ComboLink) => void
}

type KnownCombat = { link: ComboLink; state: CombatState }

/**
 * The combo's state on its link values. A link of the last edit, before or after it (the URL lags a
 * render behind), gives back that very state, so entry ids (focus, open groups) and identity (the
 * marker's Undo) survive the round trip; any other link is read anew.
 */
export function useCombatLink({ value, onChange }: UseCombatLinkOptions) {
	const [known, setKnown] = useState<readonly KnownCombat[]>([])
	const state =
		known.find(({ link }) => isSameCombatLink(link, value))?.state ??
		readCombatLink(value)

	return {
		value: state,
		onChange(next: CombatState) {
			const link = toCombatLink(next)
			setKnown([
				{ link, state: next },
				{ link: value, state },
			])
			onChange(link)
		},
	}
}
