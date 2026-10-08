import type { ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { CombatAction } from "@/lib/combat/combat"
import type { actionLabel } from "./combat-format"

/** The abilities as the form shows them, and the summoner slots: what names and shows a step. */
export type ActionSources = {
	spells: readonly Pick<ChampionSpell, "slot" | "name" | "icon">[]
	summoners: readonly (Pick<SummonerSpell, "name" | "icon"> | undefined)[]
}

export type ActionNames = Parameters<typeof actionLabel>[1]

/** The names `actionLabel` gives abilities and summoner spells. */
export function actionNames({ spells, summoners }: ActionSources): ActionNames {
	return {
		ability: (slot) =>
			spells.find((spell) => spell.slot === slot)?.name ?? slot,
		summoner: (slot) => summoners[slot]?.name ?? "Summoner spell",
	}
}

/** The game icon of an ability or a summoner spell step; none for an attack or a wait. */
export function actionIcon(
	action: CombatAction,
	{ spells, summoners }: ActionSources,
): { src: string; name: string } | undefined {
	if (action.kind === "ability") {
		const spell = spells.find(({ slot }) => slot === action.slot)
		return spell && { src: spell.icon, name: spell.name }
	}
	if (action.kind === "summoner") {
		const spell = summoners[action.slot]
		return spell && { src: spell.icon, name: spell.name }
	}
	return undefined
}
