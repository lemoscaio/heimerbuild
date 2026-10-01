import { rolesIcons } from "@/assets/roles-icons"
import { CHAMPION_ROLES, roleLabels } from "@/lib/champion-roles"
import type { RoleFilter } from "./filter-items-by-role"

type RoleInfo = { role: RoleFilter; label: string; icon: string }

export const rolesInfo: readonly RoleInfo[] = [
	{ role: "ALL", label: "All Items", icon: rolesIcons.ALL },
	...CHAMPION_ROLES.map((role) => ({
		role,
		label: roleLabels[role],
		icon: rolesIcons[role],
	})),
]
