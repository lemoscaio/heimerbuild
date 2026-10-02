import type { Shard } from "@schemas/rune"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type ShardRowProps = {
	label: string
	shards: readonly Shard[]
	value: number | undefined
	onValueChange: (shardId: number) => void
	onDescribe: (shard: Shard) => void
}

/** One stat shard row (Offense, Flex, Defense): round icon buttons, then the chosen value. */
export function ShardRow({
	label,
	shards,
	value,
	onValueChange,
	onDescribe,
}: ShardRowProps) {
	const id = useId()
	const picked = shards.find((shard) => shard.id === value)

	return (
		<div className="flex items-center gap-3 lg:gap-4">
			<RadioGroup
				aria-label={`${label} shard`}
				value={value ?? null}
				onValueChange={(shardId) => {
					if (shardId !== null) onValueChange(shardId)
				}}
				className="shrink-0 gap-3 lg:gap-5.5"
			>
				{shards.map((shard) => (
					<RadioGroupItem
						key={shard.id}
						value={shard.id}
						aria-label={shard.name}
						aria-describedby={`${id}-${shard.id}`}
						title={shard.name}
						onPointerEnter={() => onDescribe(shard)}
						onFocus={() => onDescribe(shard)}
						className="size-11 shrink-0 rounded-full border-2 border-line bg-surface-sunken p-1.5 opacity-55 transition hover:opacity-90 data-checked:border-gold data-checked:bg-line data-checked:opacity-100 lg:size-7.5 lg:p-1"
					>
						<GameIcon
							src={shard.icon}
							name={shard.name}
							className="size-full rounded-full bg-transparent"
						/>
						<span id={`${id}-${shard.id}`} hidden>
							{shard.description}
						</span>
					</RadioGroupItem>
				))}
			</RadioGroup>
			{picked && (
				<span className="min-w-0 text-success text-xs leading-tight">
					{picked.description}
				</span>
			)}
		</div>
	)
}
