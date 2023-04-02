import rolesIcons from "../assets/roles-icons"

export const rolesInfo = {
	ALL: { label: "All Items", icon: rolesIcons.ALL },
	FIGHTER: { label: "Fighter", icon: rolesIcons.FIGHTER },
	MARKSMAN: { label: "Marksman", icon: rolesIcons.MARKSMAN },
	ASSASSIN: { label: "Assassin", icon: rolesIcons.ASSASSIN },
	MAGE: { label: "Mage", icon: rolesIcons.MAGE },
	TANK: { label: "Tank", icon: rolesIcons.TANK },
	SUPPORT: { label: "Support", icon: rolesIcons.SUPPORT },
}

export type ChampionRoles = keyof typeof rolesInfo
