import type { ComputedStats, StatName } from "@/lib/stats/compute-stats"
import { formatStat, statRows } from "../lib/stats-info"

const KEY_STATS: readonly StatName[] = [
	"abilityPower",
	"attackDamage",
	"health",
	"armor",
	"magicResist",
	"attackSpeed",
	"movementSpeed",
	"mana",
]

const keyRows = KEY_STATS.flatMap(
	(stat) => statRows.find((info) => info.stat === stat) ?? [],
)

type KeyStatsProps = {
	stats: ComputedStats
}

/** The eight stats most builds care about, as compact tiles. */
export function KeyStats({ stats }: KeyStatsProps) {
	return (
		<dl aria-label="Key stats" className="grid grid-cols-4 gap-1.5 text-xs">
			{keyRows.map(({ stat, label, format }) => (
				<div key={stat} className="rounded-md bg-primary-3 px-2.5 py-1">
					<dt className="truncate text-subtle">{label}</dt>
					<dd className="font-medium text-sm tabular-nums">
						{formatStat(stats[stat].total, format)}
					</dd>
				</div>
			))}
		</dl>
	)
}
