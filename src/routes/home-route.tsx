import { createRoute } from "@tanstack/react-router"
import { AppName } from "@/components/common/app-name"
import { RouteError } from "@/components/common/route-error"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { RecentBuilds } from "@/features/build-calculator/components/recent-builds"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"
import { ChampionBrowserTitle } from "@/features/champions/components/champion-browser-title"
import { ChampionGridSkeleton } from "@/features/champions/components/champion-grid-skeleton"
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
	return (
		<HomeLayout>
			<ChampionBrowser aside={<RecentBuilds />} />
		</HomeLayout>
	)
}

function HomePending() {
	return (
		<HomeLayout>
			<ChampionBrowserTitle />
			{/* Same columns as the loaded page, with the recent builds column left empty. */}
			<div className="grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-7">
				<ChampionGridSkeleton />
			</div>
		</HomeLayout>
	)
}

function HomeLayout({ children }: React.PropsWithChildren) {
	return (
		<main className="mx-auto flex min-h-screen w-full max-w-360 flex-col gap-6 px-4 py-6 sm:px-8 lg:px-14 lg:py-9">
			<AppName />
			{children}
		</main>
	)
}
