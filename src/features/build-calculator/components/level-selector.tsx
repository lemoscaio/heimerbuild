import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { useLevelTracking } from "../hooks/use-level-tracking"
import { LevelRowLayout } from "./level-row-layout"

const levels = Array.from(
	{ length: MAX_LEVEL - MIN_LEVEL + 1 },
	(_, index) => MIN_LEVEL + index,
)

type LevelSelectorProps = {
	level: number
	onLevelChange: (level: number) => void
}

export function LevelSelector({ level, onLevelChange }: LevelSelectorProps) {
	const trackLevel = useLevelTracking(level)

	function handleSelect(nextLevel: number) {
		onLevelChange(nextLevel)
		trackLevel(nextLevel)
	}

	return (
		<LevelRowLayout>
			<Select
				value={level}
				onValueChange={(value) => value !== null && handleSelect(value)}
			>
				<div className="flex items-center justify-between gap-2">
					<SelectLabel className="text-prose">Level</SelectLabel>
					<SelectTrigger className="h-auto bg-transparent py-0 pr-1 pl-2 font-bold font-display text-3xl hover:bg-primary-2 data-popup-open:bg-primary-2">
						<SelectValue />
					</SelectTrigger>
				</div>
				<SelectContent className="min-w-15">
					{levels.map((option) => (
						<SelectItem key={option} value={option}>
							{option}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<Slider
				aria-label="Champion level"
				min={MIN_LEVEL}
				max={MAX_LEVEL}
				step={1}
				value={level}
				onValueChange={(value) => onLevelChange(value)}
				onValueCommitted={trackLevel}
			/>
		</LevelRowLayout>
	)
}
