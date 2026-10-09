import { createLazyRoute } from "@tanstack/react-router"
import { StatsMockupsPage } from "@/pages/stats-mockups/stats-mockups-page"

/** The prototype page, as its own chunk, so the stats engine stays out of the main bundle. */
export const statsMockupsLazyRoute = createLazyRoute(
	"/page-with-header/prototypes/stats-panel",
)({
	component: StatsMockupsPage,
})
