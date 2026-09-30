import type { RuneTree } from "@schemas/rune"
import { GameIcon } from "@/components/common/game-icon"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/cn"
import { treeAccentClass } from "../lib/tree-accent"

type TreePickerProps = {
	label: string
	/** The trees to offer: the secondary picker leaves out the primary tree. */
	trees: readonly RuneTree[]
	value: number | undefined
	onValueChange: (treeId: number) => void
	onDescribe: (tree: RuneTree) => void
	className?: string
}

export function TreePicker({
	label,
	trees,
	value,
	onValueChange,
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
			className={cn("flex-wrap gap-2", className)}
		>
			{trees.map((tree) => (
				<RadioGroupItem
					key={tree.id}
					value={tree.id}
					aria-label={tree.name}
					onPointerEnter={() => onDescribe(tree)}
					onFocus={() => onDescribe(tree)}
					className={cn(
						"size-11 shrink-0 rounded-full border-2 border-primary-2 p-1 opacity-45 transition hover:opacity-100 data-checked:border-(--tree) data-checked:opacity-100 lg:size-7 lg:p-0.5",
						treeAccentClass(tree.key),
					)}
				>
					<GameIcon
						src={tree.icon}
						name={tree.name}
						className="size-full rounded-full bg-primary-4"
					/>
				</RadioGroupItem>
			))}
		</RadioGroup>
	)
}
