import { RecentBuilds } from "@/features/build-calculator/components/recent-builds"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"
import { useChampionFilters } from "@/features/champions/hooks/use-champion-filters"
import { HomeLayout } from "./home-layout"

export function HomePage() {
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
