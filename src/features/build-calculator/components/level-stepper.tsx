import { Minus, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { useLevelTracking } from "../hooks/use-level-tracking"

type LevelStepperProps = {
	level: number
	onLevelChange: (level: number) => void
}

/** A compact level control: one level down or up. */
export function LevelStepper({ level, onLevelChange }: LevelStepperProps) {
	const trackLevel = useLevelTracking(level)

	function step(delta: -1 | 1) {
		const nextLevel = level + delta
		onLevelChange(nextLevel)
		trackLevel(nextLevel)
	}

	return (
		<div className="flex items-center gap-1.5">
			<Button
				type="button"
				variant="secondary"
				size="icon-sm"
				aria-label="Level down"
				disabled={level <= MIN_LEVEL}
				focusableWhenDisabled
				onClick={() => step(-1)}
			>
				<Minus />
			</Button>
			<output
				aria-label="Champion level"
				className="min-w-12 text-center font-bold font-display tabular-nums"
			>
				Lv {level}
			</output>
			<Button
				type="button"
				variant="secondary"
				size="icon-sm"
				aria-label="Level up"
				disabled={level >= MAX_LEVEL}
				focusableWhenDisabled
				onClick={() => step(1)}
			>
				<Plus />
			</Button>
		</div>
	)
}
