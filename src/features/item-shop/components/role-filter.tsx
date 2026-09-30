import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { RoleFilter as Role } from "../lib/filter-items-by-role"
import { rolesInfo } from "../lib/roles-info"

type RoleFilterProps = {
	role: Role
	onRoleChange: (role: Role) => void
	className?: string
}

/**
 * Role tabs with icon and label. In a narrower shop only the selected role shows its label,
 * and on phones none does; the label stays the accessible name.
 */
export function RoleFilter({ role, onRoleChange, className }: RoleFilterProps) {
	return (
		<ToggleGroup
			aria-label="Filter by role"
			className={cn("flex-wrap gap-1", className)}
			value={[role]}
			// Pressing the selected role again would leave none: one role is always selected.
			onValueChange={([next]) => next && onRoleChange(next)}
		>
			{rolesInfo.map(({ role: option, label, icon }) => (
				<ToggleGroupItem
					key={option}
					value={option}
					title={label}
					className="h-9 gap-1.5 px-3 text-prose text-xs data-pressed:text-white max-lg:size-11 max-lg:px-0"
				>
					<img src={icon} alt="" className="size-5 max-lg:size-7" />
					<span
						className={cn("max-lg:sr-only", {
							"@max-3xl:sr-only": option !== role,
						})}
					>
						{label}
					</span>
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
