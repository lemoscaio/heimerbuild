import { GameIcon } from "@/components/common/game-icon"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import type { Champion } from "../../../../scripts/sync-data/schemas/champion"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { ItemSlots } from "./item-slots"
import { KeyStats } from "./key-stats"
import { LevelStepper } from "./level-stepper"

type BuildBarProps = {
	champion: Pick<Champion, "name" | "icon" | "resource">
	level: number
	onLevelChange: (level: number) => void
	items: readonly Item[]
	onRemoveItem: (slot: number) => void
	notice: string | undefined
	stats: ComputedStats
	/** The way back to the overview, at the end of the bar. */
	children?: React.ReactNode
}

/** The expanded shop's bottom bar: champion, level, build slots and key stats. */
export function BuildBar({
	champion,
	level,
	onLevelChange,
	items,
	onRemoveItem,
	notice,
	stats,
	children,
}: BuildBarProps) {
	return (
		<section
			aria-label="Build"
			className="flex flex-wrap items-center gap-x-6 gap-y-3 border-primary-2 border-t bg-primary-4 px-5 py-3 text-white"
		>
			<div className="flex items-center gap-3">
				<GameIcon
					src={champion.icon}
					name={champion.name}
					className="size-14 rounded-lg border-2 border-gold/70"
				/>
				<div className="flex flex-col gap-1">
					<span className="font-bold font-display">{champion.name}</span>
					<LevelStepper level={level} onLevelChange={onLevelChange} />
				</div>
			</div>
			<ItemSlots
				layout="bar"
				items={items}
				onRemoveItem={onRemoveItem}
				notice={notice}
			/>
			<div className="min-w-0 flex-1 basis-96">
				<KeyStats stats={stats} resource={champion.resource} />
			</div>
			{children}
		</section>
	)
}
