import {
	type ComboLink,
	readComboChoices,
	readComboItems,
	readComboStart,
	serializeComboChoices,
	serializeComboItems,
	serializeComboStart,
} from "@/lib/combat/combo-link"
import { type CombatEntry, clampWaitSeconds } from "./combat-sequence"
import {
	type CombatState,
	choicesByItem,
	type FreeChoices,
} from "./combat-state"

/**
 * The combo a link holds: its entries numbered from 1 in order, waits in range, the choices of its
 * steps (a choice at a marker's position is dropped) and the cooldowns it starts on.
 */
export function readCombatLink({
	combo,
	free,
	choices,
	start,
}: ComboLink): CombatState {
	const byItem = readComboChoices(choices)
	const entries: CombatEntry[] = readComboItems(combo).map((action, index) => ({
		id: index + 1,
		action:
			action.kind === "wait"
				? { ...action, seconds: clampWaitSeconds(action.seconds) }
				: action,
	}))
	const chosen: FreeChoices = Object.fromEntries(
		entries.flatMap(({ id, action }, index) => {
			const step = byItem[index]
			return step && action.kind !== "situation" ? [[id, step]] : []
		}),
	)
	return {
		entries,
		free: free ?? false,
		choices: chosen,
		onCooldown: readComboStart(start),
	}
}

/** The link values of a combo; its defaults (no entries, strict mode, no choices, all ready) stay out. */
export function toCombatLink({
	entries,
	free,
	choices,
	onCooldown,
}: CombatState): ComboLink {
	return {
		combo: serializeComboItems(entries.map(({ action }) => action)),
		free: free || undefined,
		choices: serializeComboChoices(choicesByItem(entries, choices)),
		start: serializeComboStart(onCooldown),
	}
}

/** Whether two link values hold the same combo. */
export function isSameCombatLink(a: ComboLink, b: ComboLink): boolean {
	return (
		a.combo === b.combo &&
		!!a.free === !!b.free &&
		a.choices === b.choices &&
		a.start === b.start
	)
}
