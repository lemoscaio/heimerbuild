import { SegmentedItem } from "@/components/ui/segmented"
import {
	COMBAT_VIEW_MODES,
	type CombatViewMode,
} from "../hooks/use-combat-view-mode"
import { CombatSegmented } from "./combat-segmented"

const LABELS = {
	list: "List",
	timeline: "Timeline",
} as const satisfies Record<CombatViewMode, string>

type CombatViewSwitchProps = {
	value: CombatViewMode
	onValueChange: (mode: CombatViewMode) => void
}

/** "View: List | Timeline" over the combo's steps. */
export function CombatViewSwitch({
	value,
	onValueChange,
}: CombatViewSwitchProps) {
	return (
		<CombatSegmented
			label="View"
			value={[value]}
			onValueChange={([next]) => {
				const mode = COMBAT_VIEW_MODES.find((entry) => entry === next)
				if (mode) onValueChange(mode)
			}}
		>
			{COMBAT_VIEW_MODES.map((mode) => (
				<SegmentedItem key={mode} value={mode}>
					{LABELS[mode]}
				</SegmentedItem>
			))}
		</CombatSegmented>
	)
}
