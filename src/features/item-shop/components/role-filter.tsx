import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { RoleFilter as Role } from "../lib/filter-items-by-role"
import { rolesInfo } from "../lib/roles-info"

type RoleFilterProps = {
	role: Role
	onRoleChange: (role: Role) => void
}

export function RoleFilter({ role, onRoleChange }: RoleFilterProps) {
	return (
		<ToggleGroup
			aria-label="Filter by role"
			className="justify-center py-1.5"
			value={[role]}
			// Pressing the selected role again would leave none: one role is always selected.
			onValueChange={([next]) => next && onRoleChange(next)}
		>
			{rolesInfo.map(({ role: option, label, icon }) => (
				<ToggleGroupItem
					key={option}
					value={option}
					size="icon"
					aria-label={label}
				>
					<img src={icon} alt="" className="size-full" />
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
