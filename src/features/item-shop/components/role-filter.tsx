import { useId, useState } from "react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
	createTooltipHandle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/cn"
import { useTapTooltip } from "../hooks/use-tap-tooltip"
import type { RoleFilter as Role } from "../lib/filter-items-by-role"
import { rolesInfo } from "../lib/roles-info"

// Tailwind's `lg` breakpoint: from there on, each role shows its label.
const LG_QUERY = "(min-width: 64rem)"

type RoleFilterProps = {
	role: Role
	onRoleChange: (role: Role) => void
	className?: string
}

/** Role tabs with icon and label; phones show icons only, named by a tooltip on focus or tap. */
export function RoleFilter({ role, onRoleChange, className }: RoleFilterProps) {
	const [tooltip] = useState(createTooltipHandle<string>)
	const showTooltipOnTap = useTapTooltip(tooltip)
	const idPrefix = useId()
	const showsLabels = useMediaQuery(LG_QUERY)

	return (
		<ToggleGroup
			aria-label="Filter by role"
			className={cn("flex-wrap gap-1", className)}
			value={[role]}
			// Pressing the selected role again would leave none: one role is always selected.
			onValueChange={([next]) => next && onRoleChange(next)}
		>
			{rolesInfo.map(({ role: option, label, icon }) => (
				<TooltipTrigger
					key={option}
					id={`${idPrefix}-${option}`}
					handle={tooltip}
					payload={label}
					closeOnClick={false}
					onPointerUp={showTooltipOnTap}
					render={
						<ToggleGroupItem
							value={option}
							className="h-9 gap-1.5 px-3 text-prose text-xs data-pressed:text-white max-lg:size-11 max-lg:px-0"
						/>
					}
				>
					<img src={icon} alt="" className="size-5 max-lg:size-7" />
					<span className="max-lg:sr-only">{label}</span>
				</TooltipTrigger>
			))}
			<Tooltip handle={tooltip} disabled={showsLabels}>
				{({ payload }) => <TooltipContent>{payload}</TooltipContent>}
			</Tooltip>
		</ToggleGroup>
	)
}
