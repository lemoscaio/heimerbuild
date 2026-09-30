type RuneRailSkeletonProps = {
	/** What to do first, shown over the skeleton ("Choose a primary tree."). */
	hint: string
	/** The dimmed rows, in the same place and size as the real ones. */
	children: React.ReactNode
}

/** Holds a tree's space before it is chosen, so picking it swaps the rows without moving anything. */
export function RuneRailSkeleton({ hint, children }: RuneRailSkeletonProps) {
	return (
		<div className="relative">
			<div aria-hidden="true" className="opacity-40">
				{children}
			</div>
			<p className="absolute inset-0 flex items-center justify-center">
				<span className="rounded-full bg-primary-3/90 px-3 py-1 text-prose text-xs">
					{hint}
				</span>
			</p>
		</div>
	)
}
