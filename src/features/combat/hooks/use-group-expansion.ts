import { useState } from "react"

/**
 * Which groups of steps show their steps, in memory. A group is open while any of its entries is,
 * so it stays open when one of its steps moves or goes; groups start collapsed.
 */
export function useGroupExpansion() {
	const [open, setOpen] = useState<ReadonlySet<number>>(new Set())

	return {
		isOpen: (ids: readonly number[]) => ids.some((id) => open.has(id)),
		setOpen(ids: readonly number[], next: boolean) {
			setOpen((current) => {
				const updated = new Set(current)
				for (const id of ids) {
					if (next) updated.add(id)
					else updated.delete(id)
				}
				return updated
			})
		},
	}
}
