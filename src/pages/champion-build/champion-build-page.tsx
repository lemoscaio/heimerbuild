import { getRouteApi, useRouter } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { ShopStateProvider } from "@/features/item-shop/components/shop-state-provider"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { track } from "@/lib/analytics/analytics"
import { isRuneSelectionEmpty } from "@/lib/rune-selection"
import { ExpandedShopPage } from "./expanded-shop-page"
import { useBuildPage } from "./hooks/use-build-page"
import { MobileBuildPage } from "./mobile-build-page"
import { OverviewPage } from "./overview-page"

// Reads the route by id, so the page never imports the route that lazy-loads it.
const championRouteApi = getRouteApi("/page-with-header/champions/$key")

// Hover waits before the first tooltip, so moving across items does not cover the target;
// once one is open, the next opens instantly (Base UI groups tooltips under the provider).
const TOOLTIP_DELAY_MS = 450

/** Picks the screen: mobile below `lg`, else the overview or the expanded shop (`view=shop`). */
export function ChampionBuildPage() {
	const { key } = championRouteApi.useParams()
	const { patch, unavailablePatch } = championRouteApi.useLoaderData()
	const search = championRouteApi.useSearch()
	const navigate = championRouteApi.useNavigate()
	const router = useRouter()
	const build = useBuildPage({
		patch,
		championKey: key,
		search,
		onSearchChange: (nextSearch, { replace }) =>
			navigate({ search: nextSearch, replace, resetScroll: false }),
	})
	const isDesktop = useIsDesktop()
	const buildHref = router.buildLocation({
		to: "/champions/$key",
		params: { key },
		search: build.shareSearch,
	}).href

	// Desktop: in the action bar above the workbench. Mobile: in the bottom bar.
	const copyLink = (
		<CopyBuildLink
			layout={isDesktop ? "inline" : "stacked"}
			href={buildHref}
			onCopied={() =>
				track("build_link_copied", {
					champion: key,
					level: build.level,
					itemsCount: build.items.length,
					hasRunes: !isRuneSelectionEmpty(build.runeSelection),
				})
			}
		/>
	)
	const patchNotice = unavailablePatch && (
		<PatchNotice requestedPatch={unavailablePatch} patch={patch} />
	)

	if (!build.champion) return null
	return (
		<TooltipProvider delay={TOOLTIP_DELAY_MS}>
			{/* Above the screens: switching the view keeps the shop's search and filters. */}
			<ShopStateProvider>
				{!isDesktop ? (
					<MobileBuildPage
						build={build}
						champion={build.champion}
						patch={patch}
						copyLink={copyLink}
						patchNotice={patchNotice}
					/>
				) : build.view === "shop" ? (
					<ExpandedShopPage
						build={build}
						champion={build.champion}
						patch={patch}
						copyLink={copyLink}
					/>
				) : (
					<OverviewPage
						build={build}
						champion={build.champion}
						patch={patch}
						copyLink={copyLink}
						patchNotice={patchNotice}
					/>
				)}
			</ShopStateProvider>
		</TooltipProvider>
	)
}
