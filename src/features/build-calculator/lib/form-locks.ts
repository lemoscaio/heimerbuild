import type { Champion } from "@schemas/champion"
import { isFormUnlocked } from "@/lib/stats/champion-forms"
import type { AbilityRanks } from "@/lib/stats/rank-stats"

/** Why each locked form cannot be picked yet, by form id: "Learn R to unlock Dragon". */
export type FormLocks = Readonly<Record<string, string>>

/** The forms the ranks do not unlock yet, each with what to do; none while the ranks load. */
export function formLocks(
	forms: Champion["forms"],
	ranks: AbilityRanks | undefined,
): FormLocks {
	return Object.fromEntries(
		(forms ?? []).flatMap((form) => {
			const { requires } = form
			if (!requires || isFormUnlocked(form, ranks)) return []
			const action =
				requires.minRank === 1
					? `Learn ${requires.slot}`
					: `Rank ${requires.slot} to ${requires.minRank}`
			return [[form.id, `${action} to unlock ${form.name}`]]
		}),
	)
}
