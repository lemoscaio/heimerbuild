import type {
	Champion,
	ChampionRole,
} from "../../../../scripts/sync-data/schemas/champion"

export const roleLabels: Record<ChampionRole, string> = {
	ASSASSIN: "Assassin",
	FIGHTER: "Fighter",
	MAGE: "Mage",
	MARKSMAN: "Marksman",
	SUPPORT: "Support",
	TANK: "Tank",
}

export const attackTypeLabels: Record<Champion["attackType"], string> = {
	melee: "Melee",
	ranged: "Ranged",
}
