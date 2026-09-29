import { useId } from "react"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import { shopStats } from "../lib/shop-stats"

type StatChecklistProps = {
	stats: readonly StatKey[]
	onStatsChange: (stats: StatKey[]) => void
	/** Beside the title, above the checkboxes: the AND/OR switch. */
	children?: React.ReactNode
}

/** The stat filter as labelled checkboxes, for the expanded shop's rail. */
export function StatChecklist({
	stats,
	onStatsChange,
	children,
}: StatChecklistProps) {
	const titleId = useId()

	function toggle(stat: StatKey, checked: boolean) {
		onStatsChange(
			checked ? [...stats, stat] : stats.filter((other) => other !== stat),
		)
	}

	return (
		<fieldset
			className="flex min-w-0 flex-col gap-0.5"
			aria-labelledby={titleId}
		>
			<div className="flex items-center justify-between gap-2 pb-1.5">
				<h3
					id={titleId}
					className="font-semibold text-gold text-xs uppercase tracking-widest"
				>
					Stats
				</h3>
				{children}
			</div>
			{shopStats.map(({ stat, label, icon }) => (
				<label
					key={stat}
					className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1 text-prose text-sm hover:bg-primary-2 has-checked:bg-primary-2 has-checked:text-white"
				>
					<input
						type="checkbox"
						className="size-4 accent-lilac"
						checked={stats.includes(stat)}
						onChange={(event) => toggle(stat, event.currentTarget.checked)}
					/>
					<img src={icon} alt="" className="size-4" />
					{label}
				</label>
			))}
		</fieldset>
	)
}
