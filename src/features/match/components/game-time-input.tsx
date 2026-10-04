import { NumberField } from "@/components/ui/number-field"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import {
	clampGameTime,
	GAME_START,
	MAX_GAME_TIME,
} from "@/lib/effects/game-time"

type GameTimeInputProps = {
	/** Whole minutes into the game, 0 to 120. */
	value: number
	onValueChange: (value: number) => void
} & Omit<React.ComponentProps<"div">, "onChange">

const PRESETS = ["10", "20", "30", "40"] as const

/** The pressed preset: the one equal to the game time, if any. */
function pressedPresets(value: number): string[] {
	return PRESETS.filter((preset) => Number(preset) === value)
}

/** The game time, which time-dependent effects read: minutes with − and +, and presets 10 to 40. */
export function GameTimeInput({
	value,
	onValueChange,
	className,
	...props
}: GameTimeInputProps) {
	// An emptied field keeps the last game time; a pressed preset clicked again stays pressed.
	function changeMinutes(next: number | null) {
		if (next !== null) onValueChange(clampGameTime(next))
	}
	function pickPreset([preset]: string[]) {
		if (preset) onValueChange(Number(preset))
	}

	return (
		<div
			className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
			{...props}
		>
			<div className="flex items-center gap-1.5">
				<span className="text-subtle">Time</span>
				<NumberField
					label="Game time in minutes"
					min={GAME_START}
					max={MAX_GAME_TIME}
					step={1}
					value={value}
					onValueChange={changeMinutes}
				/>
				<span aria-hidden className="text-subtle">
					min
				</span>
			</div>
			<ToggleGroup
				aria-label="Game time presets"
				value={pressedPresets(value)}
				onValueChange={pickPreset}
			>
				{PRESETS.map((preset) => (
					<ToggleGroupItem
						key={preset}
						value={preset}
						aria-label={`${preset} minutes`}
						className="h-7 min-w-8 px-2 text-xs tabular-nums"
					>
						{preset}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</div>
	)
}
