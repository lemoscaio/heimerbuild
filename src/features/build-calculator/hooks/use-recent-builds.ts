import { useLocalStorage } from "@/hooks/use-local-storage"
import {
	MAX_RECENT_BUILDS,
	RECENT_BUILDS_KEY,
	recentBuildsStorage,
} from "../services/recent-builds"

/** This browser's recent builds, newest first, kept current as builds are edited in other tabs. */
export function useRecentBuilds() {
	const [builds] = useLocalStorage(RECENT_BUILDS_KEY, recentBuildsStorage)
	return builds.slice(0, MAX_RECENT_BUILDS)
}
