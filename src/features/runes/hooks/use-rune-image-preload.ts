import { useQueryClient } from "@tanstack/react-query"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { preloadImages } from "@/lib/preload-images"
import { runeImageUrls } from "../lib/rune-image-urls"

/** Returns a handler for intent to open the runes (hover, focus, touch): it preloads every rune image. */
export function useRuneImagePreload(patch: string) {
	const queryClient = useQueryClient()

	return function preloadRuneImages() {
		queryClient.ensureQueryData(gameDataQueries.runes(patch)).then(
			(runes) => preloadImages(runeImageUrls(runes)),
			// The rune page shows the load error itself.
			() => {},
		)
	}
}
