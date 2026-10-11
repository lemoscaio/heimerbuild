import { SegmentedItem } from "@/components/ui/segmented"
import type { CombatRowOrder } from "../lib/combat-rows"
import { CombatSegmented } from "./combat-segmented"

const ORDERS = [
	{ value: "hit", label: "Hit time" },
	{ value: "step", label: "Step" },
] as const satisfies readonly { value: CombatRowOrder; label: string }[]

type CombatRowOrderSwitchProps = {
	value: CombatRowOrder
	onValueChange: (order: CombatRowOrder) => void
}

/** "Order by: Hit time | Step" over the combo's steps, in the Combo tab and the expanded combo. */
export function CombatRowOrderSwitch({
	value,
	onValueChange,
}: CombatRowOrderSwitchProps) {
	return (
		<CombatSegmented
			label="Order by"
			value={[value]}
			onValueChange={([next]) => {
				const order = ORDERS.find((entry) => entry.value === next)
				if (order) onValueChange(order.value)
			}}
		>
			{ORDERS.map(({ value: order, label }) => (
				<SegmentedItem key={order} value={order}>
					{label}
				</SegmentedItem>
			))}
		</CombatSegmented>
	)
}
