import { GameIcon } from "@/components/common/game-icon"
import { Button } from "@/components/ui/button"
import { useRunes } from "@/data/hooks/use-runes"
import { cn } from "@/lib/cn"
import type { RuneSelection } from "@/lib/rune-selection"
import { treeAccentClass } from "../lib/tree-accent"

type RuneSummaryProps = {
	patch: string
	selection: RuneSelection
	/** Whether the rune page is the open tab. */
	isEditing: boolean
	onEdit: () => void
} & Omit<React.ComponentProps<"section">, "children">

/** The rune page at a glance (keystone, trees, shards) in the build column; opens the editor. */
export function RuneSummary({
	patch,
	selection,
	isEditing,
	onEdit,
	className,
	...props
}: RuneSummaryProps) {
	const { data: runes } = useRunes(patch)
	const primaryTree = runes?.trees.find(
		(tree) => tree.id === selection.primary?.treeId,
	)
	const secondaryTree = runes?.trees.find(
		(tree) => tree.id === selection.secondary?.treeId,
	)
	const keystone = primaryTree?.keystones.find(
		(rune) => rune.id === selection.primary?.keystoneId,
	)
	const treeNames = [primaryTree?.name, secondaryTree?.name].filter(Boolean)
	const shardCount = runes?.shardRows.length ?? 0

	return (
		<section
			aria-labelledby="rune-summary-title"
			className={cn(
				"flex flex-col gap-2.5 rounded-xl border border-primary-2 bg-primary-3 p-4",
				{ "border-lilac": isEditing },
				treeAccentClass(primaryTree?.key),
				className,
			)}
			{...props}
		>
			<div className="flex items-center justify-between gap-2">
				<h2
					id="rune-summary-title"
					className="font-bold font-display text-base"
				>
					Runes
				</h2>
				<Button
					variant="ghost"
					size="sm"
					className="text-lilac"
					aria-pressed={isEditing}
					onClick={onEdit}
				>
					{isEditing
						? "Editing"
						: keystone || treeNames.length
							? "Edit"
							: "Choose"}
				</Button>
			</div>
			<div className="flex items-center gap-2.5">
				{keystone ? (
					<GameIcon
						src={keystone.icon}
						name={keystone.name}
						className="size-11 rounded-full border-(--tree) border-2 bg-primary-4"
					/>
				) : (
					<span className="size-11 shrink-0 rounded-full border-2 border-primary-2 border-dashed" />
				)}
				<div className="flex min-w-0 flex-col">
					<span className="truncate font-semibold text-sm">
						{keystone?.name ?? "No keystone"}
					</span>
					<span className="truncate text-subtle text-xs">
						{treeNames.length ? treeNames.join(" · ") : "No trees yet"}
					</span>
				</div>
				{!!shardCount && (
					<span
						role="img"
						aria-label={`${selection.shardIds.filter(Boolean).length} of ${shardCount} stat shards`}
						className="ml-auto flex gap-1"
					>
						{Array.from({ length: shardCount }, (_, index) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: one dot per shard row
								key={index}
								className={cn("size-2.5 rounded-full bg-primary-2", {
									"bg-gold": selection.shardIds[index] !== undefined,
								})}
							/>
						))}
					</span>
				)}
			</div>
		</section>
	)
}
