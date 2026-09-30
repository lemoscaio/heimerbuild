import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import type { RoleFilter as Role } from "../lib/filter-items-by-role"
import { rolesInfo } from "../lib/roles-info"

type RoleFilterProps = {
	role: Role
	onRoleChange: (role: Role) => void
	/** `vertical`: a labelled list, for the expanded shop's rail. */
	orientation?: "horizontal" | "vertical"
}

export function RoleFilter({
	role,
	onRoleChange,
	orientation = "horizontal",
}: RoleFilterProps) {
	const isVertical = orientation === "vertical"

	return (
		<ToggleGroup
			aria-label="Filter by role"
			orientation={orientation}
			className={cn("justify-center py-1.5", {
				"items-stretch gap-1 py-0": isVertical,
			})}
			value={[role]}
			// Pressing the selected role again would leave none: one role is always selected.
			onValueChange={([next]) => next && onRoleChange(next)}
		>
			{rolesInfo.map(({ role: option, label, icon }) => (
				<ToggleGroupItem
					key={option}
					value={option}
					size={isVertical ? "default" : "icon"}
					aria-label={isVertical ? undefined : label}
					className={cn({ "h-9 justify-start gap-2.5 px-2": isVertical })}
				>
					<img
						src={icon}
						alt=""
						className={cn("size-full", { "size-6": isVertical })}
					/>
					{isVertical && label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
