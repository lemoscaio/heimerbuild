import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import { roleLabels } from "../lib/champion-labels"

const ALL_ROLES = "ALL"

const roleOptions: { value: ChampionRole | typeof ALL_ROLES; label: string }[] =
	[
		{ value: ALL_ROLES, label: "All" },
		...(
			["FIGHTER", "MAGE", "ASSASSIN", "MARKSMAN", "TANK", "SUPPORT"] as const
		).map((role) => ({ value: role, label: roleLabels[role] })),
	]

type ChampionRoleFilterProps = {
	/** `undefined` shows every role. */
	role: ChampionRole | undefined
	onRoleChange: (role: ChampionRole | undefined) => void
}

export function ChampionRoleFilter({
	role,
	onRoleChange,
}: ChampionRoleFilterProps) {
	return (
		<ToggleGroup
			aria-label="Filter by role"
			className="flex-wrap justify-center gap-2"
			value={[role ?? ALL_ROLES]}
			// Pressing the selected chip again would leave none: one option is always selected.
			onValueChange={([next]) =>
				next && onRoleChange(next === ALL_ROLES ? undefined : next)
			}
		>
			{roleOptions.map(({ value, label }) => (
				<ToggleGroupItem
					key={value}
					value={value}
					className="h-8.5 rounded-full border border-primary-2 px-3.5 font-normal text-prose data-pressed:inset-ring-0 data-pressed:border-lilac data-pressed:bg-primary-2 data-pressed:text-white"
				>
					{label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	)
}
