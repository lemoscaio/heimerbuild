import { useState } from "react"
import { useItems } from "@/data/hooks/use-items"
import { useBuild } from "@/features/build-calculator/hooks/use-build"
import type {
	BuildSearch,
	BuildView,
} from "@/features/build-calculator/lib/build-search"
import { track } from "@/lib/analytics/analytics"

type UseBuildPageOptions = Parameters<typeof useBuild>[0]

export type BuildPage = ReturnType<typeof useBuildPage>

/**
 * The build page: `useBuild` plus the page's own state, the view (kept in the URL) and the
 * shop item picked for a closer look. `addItem` also closes that item's details.
 */
export function useBuildPage({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildPageOptions) {
	// Build edits keep the view the page is in.
	const build = useBuild({
		patch,
		championKey,
		search,
		onSearchChange: (nextSearch, navigation) =>
			onSearchChange({ ...nextSearch, view: search.view }, navigation),
	})
	const { data: itemsById } = useItems(patch)
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const view: BuildView = search.view ?? "overview"
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const selectedItemStats = selectedItem && build.statsWithItem(selectedItem)
	const preview =
		selectedItem && selectedItemStats
			? { label: selectedItem.name, stats: selectedItemStats }
			: undefined

	function setView(nextView: BuildView) {
		onSearchChange(
			{ ...build.buildSearch, view: viewParam(nextView) },
			{ replace: false },
		)
	}

	function selectItem(itemId: string) {
		if (itemId === selectedItemId) return
		setSelectedItemId(itemId)
		track("shop_item_selected", { itemId })
	}

	function addItem(itemId: string) {
		if (build.addItem(itemId)) setSelectedItemId(undefined)
	}

	return {
		...build,
		addItem,
		/** The overview workbench or the expanded shop, kept in the URL. */
		view,
		setView,
		/** The shop item picked for a closer look, not in the build yet. */
		selectedItem,
		selectItem,
		clearSelection: () => setSelectedItemId(undefined),
		/** The stats with the selected item added, while one is selected. */
		preview,
		/** The full build for sharing, pinned to the patch in use, in the current view. */
		shareSearch: { ...build.shareSearch, view: search.view },
	}
}

function viewParam(view: BuildView): BuildSearch["view"] {
	return view === "shop" ? view : undefined
}
