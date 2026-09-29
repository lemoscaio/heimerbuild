import { useRef } from "react"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { track } from "@/lib/analytics/analytics"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { LevelRowLayout } from "./level-row-layout"

const LEVEL_TRACK_DELAY_MS = 800

const levels = Array.from(
	{ length: MAX_LEVEL - MIN_LEVEL + 1 },
	(_, index) => MIN_LEVEL + index,
)

type LevelSelectorProps = {
	level: number
	onLevelChange: (level: number) => void
}

export function LevelSelector({ level, onLevelChange }: LevelSelectorProps) {
	// The slider changes the level on every tick and commits on every arrow key:
	// track only the level the user settles on.
	const trackedLevel = useRef(level)
	const trackTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

	function trackLevel(nextLevel: number) {
		clearTimeout(trackTimeout.current)
		trackTimeout.current = setTimeout(() => {
			if (nextLevel !== trackedLevel.current) {
				trackedLevel.current = nextLevel
				track("level_changed", { level: nextLevel })
			}
		}, LEVEL_TRACK_DELAY_MS)
	}

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
				<div className="flex shrink-0 items-center gap-2">
					<SelectLabel className="text-sm">Current Level:</SelectLabel>
					<SelectTrigger className="min-w-15 font-bold">
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
				className="max-w-75"
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
