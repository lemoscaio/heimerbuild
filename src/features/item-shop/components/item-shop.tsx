import { useState } from "react"
import DotLoader from "react-spinners/esm/DotLoader"
import { useItems } from "@/data/hooks/use-items"
import {
	filterItemsByRole,
	type RoleFilter as Role,
} from "../lib/filter-items-by-role"
import { ItemGrid } from "./item-grid"
import { RoleFilter } from "./role-filter"

type ItemShopProps = {
	patch: string
	onItemClick: (itemId: string) => void
}

export function ItemShop({ patch, onItemClick }: ItemShopProps) {
	const itemsQuery = useItems(patch)
	const [role, setRole] = useState<Role>("ALL")

	const items = itemsQuery.data
		? filterItemsByRole(Object.values(itemsQuery.data), role)
		: []

	return (
		<div className="champion-info__items items">
			<RoleFilter role={role} onRoleChange={setRole} />
			<div className="items__second-row">
				<div className="items__list">
					<ItemGrid items={items} onItemClick={onItemClick} />
					{itemsQuery.isPending && (
						<DotLoader color="white" className="items__loader" />
					)}
					{itemsQuery.isError && (
						<div className="items__load-error-container load-error-container">
							<p>Something went wrong!</p>
							<button
								type="button"
								className="items__load-button load-button"
								onClick={() => itemsQuery.refetch()}
							>
								Click here to try again
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
