import * as z from "zod/mini"
import { useLocalStorage } from "@/hooks/use-local-storage"

const STORAGE_KEY = "heimerbuild:home-champions-expanded:v1"
const expandedStorage = { schema: z.boolean(), defaultValue: false }

/** Whether the home page shows the full champion list, remembered between visits; collapsed on a first visit. */
export function useChampionListExpanded() {
	return useLocalStorage(STORAGE_KEY, expandedStorage)
}
