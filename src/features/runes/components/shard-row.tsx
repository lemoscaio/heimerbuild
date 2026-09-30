import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { Shard } from "../../../../scripts/sync-data/schemas/rune"
import type { DescribedPerk } from "./rune-row"

type ShardRowProps = {
	label: string
	shards: readonly Shard[]
	value: number | undefined
	onValueChange: (shardId: number) => void
	onDescribe: (perk: DescribedPerk) => void
}

/** One stat shard row (Offense, Flex, Defense), as chips with the shard's name. */
export function ShardRow({
	label,
	shards,
	value,
	onValueChange,
	onDescribe,
}: ShardRowProps) {
	const id = useId()

	return (
		<div className="flex items-center gap-2">
			<span aria-hidden="true" className="w-14 shrink-0 text-subtle text-xs">
				{label}
			</span>
			<RadioGroup
				aria-label={`${label} shard`}
				value={value ?? null}
				onValueChange={(shardId) => {
					if (shardId !== null) onValueChange(shardId)
				}}
				className="grid flex-1 grid-cols-3 gap-1.5"
			>
				{shards.map((shard) => (
					<RadioGroupItem
						key={shard.id}
						value={shard.id}
						aria-describedby={`${id}-${shard.id}`}
						onPointerEnter={() => onDescribe(shard)}
						onFocus={() => onDescribe(shard)}
						className="flex min-h-11 items-center gap-1.5 rounded-lg border border-primary-2 px-2 py-1 text-left text-[11px] text-subtle leading-tight transition hover:text-prose data-checked:border-gold data-checked:bg-primary-2 data-checked:text-white lg:min-h-9"
					>
						<GameIcon
							src={shard.icon}
							name=""
							className="size-4 shrink-0 rounded-full bg-transparent"
						/>
						{shard.name}
						<span id={`${id}-${shard.id}`} hidden>
							{shard.description}
						</span>
					</RadioGroupItem>
				))}
			</RadioGroup>
		</div>
	)
}
