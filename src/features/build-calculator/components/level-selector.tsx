import type { ChangeEvent } from "react"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"

const levels = Array.from(
	{ length: MAX_LEVEL - MIN_LEVEL + 1 },
	(_, index) => MIN_LEVEL + index,
)

type LevelSelectorProps = {
	level: number
	onLevelChange: (level: number) => void
}

export function LevelSelector({ level, onLevelChange }: LevelSelectorProps) {
	function handleChange(
		event: ChangeEvent<HTMLSelectElement | HTMLInputElement>,
	) {
		onLevelChange(Number(event.target.value))
	}

	return (
		<div className="champion-info__level-container level-container">
			<label htmlFor="championLevel" className="level-container__label">
				Current Level:
				<select
					className="level-container__level-select"
					name="championLevel"
					id="championLevel"
					value={level}
					onChange={handleChange}
				>
					{levels.map((option) => (
						<option
							value={option}
							key={option}
							className="level-container__level-option"
						>
							{option}
						</option>
					))}
				</select>
			</label>
			<input
				className="level-container__level-slider level-slider"
				type="range"
				aria-label="Champion level"
				min={MIN_LEVEL}
				max={MAX_LEVEL}
				step="1"
				value={level}
				onChange={handleChange}
			/>
		</div>
	)
}
