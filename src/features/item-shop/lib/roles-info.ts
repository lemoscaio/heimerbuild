import { rolesIcons } from "@/assets/roles-icons"
import type { RoleFilter } from "./filter-items-by-role"

type RoleInfo = { role: RoleFilter; label: string; icon: string }

export const rolesInfo: readonly RoleInfo[] = [
	{ role: "ALL", label: "All Items", icon: rolesIcons.ALL },
	{ role: "FIGHTER", label: "Fighter", icon: rolesIcons.FIGHTER },
	{ role: "MARKSMAN", label: "Marksman", icon: rolesIcons.MARKSMAN },
	{ role: "ASSASSIN", label: "Assassin", icon: rolesIcons.ASSASSIN },
	{ role: "MAGE", label: "Mage", icon: rolesIcons.MAGE },
	{ role: "TANK", label: "Tank", icon: rolesIcons.TANK },
	{ role: "SUPPORT", label: "Support", icon: rolesIcons.SUPPORT },
]
