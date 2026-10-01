import { cn } from "@/lib/cn"
import {
	RUNE_ROW_GAP_CLASSES,
	RUNE_SIZE_CLASSES,
	type RuneSize,
} from "../lib/rune-styles"

type RuneRowSkeletonProps = {
	count: number
	size: RuneSize
}

/** Empty circles in the place and size of a `RuneRow`, before its tree is chosen. */
export function RuneRowSkeleton({ count, size }: RuneRowSkeletonProps) {
	return (
		<div className={cn("flex items-center", RUNE_ROW_GAP_CLASSES[size])}>
			{Array.from({ length: count }, (_, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: identical placeholders
					key={index}
					className={cn(
						"shrink-0 rounded-full border-2 border-line bg-surface-sunken",
						RUNE_SIZE_CLASSES[size],
					)}
				/>
			))}
		</div>
	)
}
