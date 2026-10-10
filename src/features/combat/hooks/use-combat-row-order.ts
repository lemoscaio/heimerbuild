import * as z from "zod/mini"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { StoredValueOptions } from "@/lib/local-storage"
import type { CombatRowOrder } from "../lib/combat-rows"

export const COMBAT_ROW_ORDERS = [
	"hit",
	"step",
] as const satisfies readonly CombatRowOrder[]

const STORAGE_KEY = "heimerbuild:combo-row-order:v1"
const rowOrderStorage: StoredValueOptions<CombatRowOrder> = {
	schema: z.enum(COMBAT_ROW_ORDERS),
	defaultValue: "hit",
}

/** The steps' order in the List, the same in the Combo tab and the expanded combo, kept per browser; by hit time until one is picked. */
export function useCombatRowOrder() {
	const [order, setOrder] = useLocalStorage(STORAGE_KEY, rowOrderStorage)
	return [order, setOrder] as const
}
