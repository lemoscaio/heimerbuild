import { createLazyRoute } from "@tanstack/react-router"
import { ChampionBuildPage } from "@/pages/champion-build/champion-build-page"

/** The build page, loaded as its own chunk; the id includes the pathless `page-with-header` layout. */
export const championLazyRoute = createLazyRoute(
	"/page-with-header/champions/$key",
)({
	component: ChampionBuildPage,
})
