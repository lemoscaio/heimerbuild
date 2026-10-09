import * as z from "zod/mini"
import { useLocalStorage } from "@/hooks/use-local-storage"
import type { StoredValueOptions } from "@/lib/local-storage"

const STORAGE_KEY = "heimerbuild:stats-sources:v1"
const showSourcesStorage: StoredValueOptions<boolean> = {
	schema: z.boolean(),
	defaultValue: false,
}

/** The Stats panel's "Show sources" switch, kept per browser (not in the link); off until turned on. */
export function useShowSources() {
	const [showSources, setShowSources] = useLocalStorage(
		STORAGE_KEY,
		showSourcesStorage,
	)
	return [showSources, setShowSources] as const
}
