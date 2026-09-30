const STORAGE_KEY = "heimerbuild:chunk-reload-at"
// A chunk that still fails this soon after a reload is not a stale deploy: show the error.
const RELOAD_GUARD_MS = 10_000

type ChunkReloadOptions = {
	/** A failed hover preload is skipped; the click that follows retries and reloads. */
	isNavigating: () => boolean
}

/** Reloads unless the previous chunk-error reload (stored timestamp) was within the guard window. */
export function shouldReloadAfterChunkError(
	lastReloadAt: string | null,
	now: number,
) {
	const last = Number(lastReloadAt)
	return !lastReloadAt || !Number.isFinite(last) || now - last > RELOAD_GUARD_MS
}

/** After a deploy, an open tab asks for chunks that no longer exist; one reload fetches the new ones. */
export function reloadOnChunkError({ isNavigating }: ChunkReloadOptions) {
	window.addEventListener("vite:preloadError", () => {
		if (!isNavigating()) return
		const now = Date.now()
		try {
			if (
				!shouldReloadAfterChunkError(sessionStorage.getItem(STORAGE_KEY), now)
			) {
				return
			}
			sessionStorage.setItem(STORAGE_KEY, String(now))
		} catch {
			return // no storage, no loop guard: let the route show its error
		}
		window.location.reload()
	})
}
