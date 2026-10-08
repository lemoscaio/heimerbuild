import * as z from "zod/mini"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { StoredValueOptions } from "@/lib/local-storage"

/** How the combo's steps show: as a list (cards or rows) or as a vertical timeline (issue 402). */
export type CombatViewMode = "list" | "timeline"

export const COMBAT_VIEW_MODES = [
	"list",
	"timeline",
] as const satisfies readonly CombatViewMode[]

const STORAGE_KEY = "heimerbuild:combo-view:v1"
const viewModeStorage: StoredValueOptions<CombatViewMode> = {
	schema: z.enum(COMBAT_VIEW_MODES),
	defaultValue: "list",
}

/** The combo's view, kept per browser for every champion and screen; the list until one is picked. */
export function useCombatViewMode() {
	const [mode, setMode] = useLocalStorage(STORAGE_KEY, viewModeStorage)
	return [mode, setMode] as const
}
