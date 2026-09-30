import { createLazyRoute, useRouter } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CopyBuildLink } from "@/features/build-calculator/components/copy-build-link"
import { PatchNotice } from "@/features/build-calculator/components/patch-notice"
import { useBuildPage } from "@/features/build-calculator/hooks/use-build-page"
import { ShopStateProvider } from "@/features/item-shop/components/shop-state-provider"
import { useMediaQuery } from "@/hooks/use-media-query"
import { track } from "@/lib/analytics/analytics"
import { isRuneSelectionEmpty } from "@/lib/rune-selection"
import { ExpandedShopPage } from "./champion-page/expanded-shop-page"
import { MobileBuildPage } from "./champion-page/mobile-build-page"
import { OverviewPage } from "./champion-page/overview-page"

// Tailwind's `lg` breakpoint.
const LG_QUERY = "(min-width: 64rem)"

// Hover waits before the first tooltip, so moving across items does not cover the target;
// once one is open, the next opens instantly (Base UI groups tooltips under the provider).
const TOOLTIP_DELAY_MS = 450

/** The build page, loaded as its own chunk; the id includes the pathless `page-with-header` layout. */
export const championLazyRoute = createLazyRoute(
	"/page-with-header/champions/$key",
)({
	component: ChampionPage,
})

/** Picks the screen: mobile below `lg`, else the overview or the expanded shop (`view=shop`). */
function ChampionPage() {
	const { key } = championLazyRoute.useParams()
	const { patch, unavailablePatch } = championLazyRoute.useLoaderData()
	const search = championLazyRoute.useSearch()
	const navigate = championLazyRoute.useNavigate()
	const router = useRouter()
	const build = useBuildPage({
		patch,
		championKey: key,
		search,
		onSearchChange: (nextSearch, { replace }) =>
			navigate({ search: nextSearch, replace, resetScroll: false }),
	})
	const isDesktop = useMediaQuery(LG_QUERY)
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
