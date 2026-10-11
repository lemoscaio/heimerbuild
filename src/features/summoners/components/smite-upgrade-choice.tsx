import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import type { SmiteUpgrade } from "@/lib/smite-upgrade"
import {
	BASE_SMITE,
	SMITE_UPGRADE_OPTIONS,
	smiteUpgradeOf,
	smiteUpgradeText,
} from "../lib/smite-upgrade-options"

type SmiteUpgradeChoiceProps = {
	spell: SummonerSpell
	value: SmiteUpgrade | undefined
	onValueChange: (upgrade: SmiteUpgrade | undefined) => void
}

/** Smite's upgrade in the build (base, Unleashed, Primal), with what it does to a champion. */
export function SmiteUpgradeChoice({
	spell,
	value,
	onValueChange,
}: SmiteUpgradeChoiceProps) {
	const labelId = useId()
	const hintId = useId()

	return (
		<div className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface-sunken px-2.5 py-2">
			<div className="flex items-center justify-between gap-2">
				<span id={labelId} className="font-semibold text-white text-xs">
					Smite upgrade
				</span>
				<Segmented
					aria-labelledby={labelId}
					aria-describedby={hintId}
					value={[value ?? BASE_SMITE]}
					onValueChange={([next]) => {
						if (next) onValueChange(smiteUpgradeOf(next))
					}}
					className="bg-surface"
				>
					{SMITE_UPGRADE_OPTIONS.map((option) => (
						<SegmentedItem
							key={option.value}
							value={option.value}
							height="touch"
							className="px-2.5"
						>
							{option.label}
						</SegmentedItem>
					))}
				</Segmented>
			</div>
			<p id={hintId} aria-live="polite" className="text-[11px] text-subtle">
				{smiteUpgradeText(spell, value)}
			</p>
		</div>
	)
}
