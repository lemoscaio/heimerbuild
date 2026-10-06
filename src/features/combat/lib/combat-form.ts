import type { CombatBuild } from "@/lib/combat/simulate-combat"
import { selectedForm } from "@/lib/stats/champion-forms"

/** The form the combo runs in: the selected one, or the default while its rank is missing. */
export function combatFormId({
	champion,
	form,
	ranks,
}: Pick<CombatBuild, "champion" | "form" | "ranks">): string | undefined {
	return selectedForm(champion.forms, form, { ranks })?.id
}
