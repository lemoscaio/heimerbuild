import type { ChampionRole } from "@schemas/champion"

/** Every role, in the in-game shop's order; every role list in the app uses it. */
export const CHAMPION_ROLES = [
	"FIGHTER",
	"MARKSMAN",
	"ASSASSIN",
	"MAGE",
	"TANK",
	"SUPPORT",
] as const satisfies readonly ChampionRole[]

export const roleLabels: Record<ChampionRole, string> = {
	ASSASSIN: "Assassin",
	FIGHTER: "Fighter",
	MAGE: "Mage",
	MARKSMAN: "Marksman",
	SUPPORT: "Support",
	TANK: "Tank",
}
