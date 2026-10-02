import type { Champion } from "@schemas/champion"
import { BuildBar } from "@/features/build-calculator/components/build-bar"
import { ItemDetailsPanel } from "@/features/build-calculator/components/item-details-panel"
import { ShopViewToggle } from "@/features/build-calculator/components/shop-view-toggle"
import { WorkbenchLayout } from "@/features/build-calculator/components/workbench-layout"
import { ItemShop } from "@/features/item-shop/components/item-shop"
import { useAnalyticsContext } from "@/hooks/use-analytics-context"
import type { BuildPage } from "./hooks/use-build-page"

type ExpandedShopPageProps = {
	build: BuildPage
	champion: Champion
	patch: string
	copyLink: React.ReactNode
}

/** From `lg` up, `view=shop`: the full-width shop, the item details beside it, the build bar below. */
export function ExpandedShopPage({
	build,
	champion,
	patch,
	copyLink,
}: ExpandedShopPageProps) {
	useAnalyticsContext("shop_mode", "expanded")

	return (
		<WorkbenchLayout
			view="shop"
			actions={copyLink}
			shop={
				<ItemShop
					patch={patch}
					layout="expanded"
					actions={
						<ShopViewToggle view={build.view} onViewChange={build.setView} />
					}
					selectedItemId={build.selectedItem?.id}
					onItemSelect={build.selectItem}
					onItemAdd={build.addItem}
				/>
			}
			side={
				<ItemDetailsPanel
					item={build.selectedItem}
					stats={build.stats}
					next={build.preview?.stats}
					isBuildFull={build.isFull}
					onAdd={build.addItem}
					onClose={build.clearSelection}
				/>
			}
			bar={
				build.stats && (
					<BuildBar
						champion={champion}
						formName={build.form?.name}
						level={build.level}
						onLevelChange={build.setLevel}
						items={build.items}
						onRemoveItem={build.removeItem}
						notice={build.notice}
						announcement={build.announcement}
						stats={build.stats}
					/>
				)
			}
		/>
	)
}
