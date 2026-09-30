import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/cn"
import type { RuneTree } from "../../../../scripts/sync-data/schemas/rune"
import { treeAccentClass } from "../lib/tree-accent"

type TreePickerProps = {
	label: string
	trees: readonly RuneTree[]
	value: number | undefined
	onValueChange: (treeId: number) => void
	/** The primary tree, which the secondary picker cannot take. */
	unavailableTreeId?: number
	onDescribe: (tree: { name: string }) => void
	className?: string
}

export function TreePicker({
	label,
	trees,
	value,
	onValueChange,
	unavailableTreeId,
	onDescribe,
	className,
}: TreePickerProps) {
	return (
		<RadioGroup
			aria-label={label}
			value={value ?? null}
			onValueChange={(treeId) => {
				if (treeId !== null) onValueChange(treeId)
			}}
			className={cn("gap-2", className)}
		>
			{trees.map((tree) => (
				<RadioGroupItem
					key={tree.id}
					value={tree.id}
					aria-label={tree.name}
					disabled={tree.id === unavailableTreeId}
					onPointerEnter={() => onDescribe(tree)}
					onFocus={() => onDescribe(tree)}
					className={cn(
						"size-11 shrink-0 rounded-full border-2 border-primary-2 p-1 opacity-60 transition hover:opacity-100 data-checked:border-(--tree) data-checked:bg-(--tree)/20 data-checked:opacity-100 lg:size-9",
						treeAccentClass(tree.key),
					)}
				>
					<GameIcon
						src={tree.icon}
						name={tree.name}
						className="size-full rounded-full bg-transparent"
					/>
				</RadioGroupItem>
			))}
		</RadioGroup>
	)
}
