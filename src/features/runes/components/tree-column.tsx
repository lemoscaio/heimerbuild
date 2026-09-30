import type { RuneTree } from "@schemas/rune"
import { GameIcon } from "@/components/common/game-icon"
import { cn } from "@/lib/cn"
import { treeAccentClass } from "../lib/tree-accent"

type TreeColumnProps = {
	/** "Primary" or "Secondary". */
	title: string
	tree: RuneTree | undefined
	/** The tree picker, shown next to the chosen tree's emblem. */
	picker: React.ReactNode
	emblemSize: "large" | "medium"
	/** The tree's rows, or their skeleton until a tree is chosen. */
	children: React.ReactNode
	className?: string
}

/** One tree of the rune page: its emblem and picker on top, its rows below, in the tree's color. */
export function TreeColumn({
	title,
	tree,
	picker,
	emblemSize,
	children,
	className,
}: TreeColumnProps) {
	const emblemClassName = cn("shrink-0 rounded-full", {
		"size-13": emblemSize === "large",
		"size-11": emblemSize === "medium",
	})

	return (
		<section
			className={cn(
				"flex flex-col gap-5",
				treeAccentClass(tree?.key),
				className,
			)}
		>
			<h3 className="sr-only">
				{tree ? `${title} tree: ${tree.name}` : `${title} tree`}
			</h3>
			<div className="flex items-center gap-3.5">
				{tree ? (
					<GameIcon
						src={tree.icon}
						name={tree.name}
						className={cn(
							"border-(--tree) border-3 bg-primary-4 shadow-(--tree)/35 shadow-[0_0_18px]",
							emblemClassName,
						)}
					/>
				) : (
					<span
						aria-hidden="true"
						className={cn(
							"border-2 border-primary-2 border-dashed",
							emblemClassName,
						)}
					/>
				)}
				{picker}
			</div>
			{children}
		</section>
	)
}
