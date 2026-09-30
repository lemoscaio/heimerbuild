/** Dimmed rows holding a tree's space before it is chosen, so picking it swaps them without moving anything. */
export function RuneRailSkeleton({ children }: React.PropsWithChildren) {
	return (
		<div aria-hidden="true" className="opacity-40">
			{children}
		</div>
	)
}
