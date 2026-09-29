import { createRoute } from "@tanstack/react-router"
import { AppName } from "@/components/common/app-name"
import { MainPageLogo } from "@/components/common/main-page-logo"
import { RouteError } from "@/components/common/route-error"
import { Skeleton } from "@/components/ui/skeleton"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { RecentBuilds } from "@/features/build-calculator/components/recent-builds"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"
import { useChampionFilters } from "@/features/champions/hooks/use-champion-filters"
import { rootRoute } from "./root-route"

export const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	loader: async ({ context: { queryClient } }) => {
		const { currentPatch } = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		await queryClient.ensureQueryData(gameDataQueries.champions(currentPatch))
	},
	component: HomePage,
	pendingComponent: HomePending,
	errorComponent: RouteError,
})

function HomePage() {
	const filters = useChampionFilters()

	return (
		<HomeLayout>
			<ChampionBrowser
				filters={filters}
				recentBuilds={
					<RecentBuilds search={filters.search} role={filters.role} />
				}
			/>
		</HomeLayout>
	)
}

function HomePending() {
	return (
		<HomeLayout>
			<Skeleton className="h-12 w-full max-w-140 rounded-xl" />
			<Skeleton className="h-11 w-60 rounded-full" />
		</HomeLayout>
	)
}

/** Brand, mascot and the page content, in one centred column. */
function HomeLayout({ children }: React.PropsWithChildren) {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-360 flex-col items-center gap-5 px-4 py-6 sm:gap-7 sm:px-8 lg:px-24 lg:py-12">
			<AppName />
			<MainPageLogo />
			{children}
		</main>
	)
}
