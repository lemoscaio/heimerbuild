import type { Champion } from "@schemas/champion"

export const attackTypeLabels: Record<Champion["attackType"], string> = {
	melee: "Melee",
	ranged: "Ranged",
}
