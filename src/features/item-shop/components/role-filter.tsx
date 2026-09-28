import type { RoleFilter as Role } from "../lib/filter-items-by-role"
import { rolesInfo } from "../lib/roles-info"

type RoleFilterProps = {
	role: Role
	onRoleChange: (role: Role) => void
}

export function RoleFilter({ role, onRoleChange }: RoleFilterProps) {
	return (
		<div className="items__filter-row">
			{rolesInfo.map(({ role: option, label, icon }) => (
				<button
					type="button"
					key={option}
					className="items__filter-roles icon-button"
					aria-label={label}
					aria-pressed={option === role}
					onClick={() => onRoleChange(option)}
				>
					<img src={icon} alt="" className="items__role-icon" />
				</button>
			))}
		</div>
	)
}
