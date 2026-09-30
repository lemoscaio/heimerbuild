import { useState } from "react"
import { readRecentBuilds } from "../services/recent-builds"

/** This browser's recent builds, read once when the component mounts. */
export function useRecentBuilds() {
	const [builds] = useState(() => readRecentBuilds())
	return builds
}
