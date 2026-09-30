import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type MobileLayoutProps = {
	/** Champion, level and build slots, above the tabs. */
	top: React.ReactNode
	stats: React.ReactNode
	shop: React.ReactNode
	runes: React.ReactNode
	/** Touch or focus on the Runes tab, before it opens (preloads its images). */
	onRunesIntent?: () => void
	/** Pinned to the bottom of the screen: item details and page actions. */
	bottom: React.ReactNode
}

/** The champion page below `lg`: the build on top, then Stats | Shop | Runes tabs. */
export function MobileLayout({
	top,
	stats,
	shop,
	runes,
	onRunesIntent,
	bottom,
}: MobileLayoutProps) {
	return (
		<main className="min-h-screen bg-primary-3 px-4 pt-[calc(var(--spacing-header)+--spacing(4))] pb-28 text-sm text-white">
			<div className="flex flex-col gap-4">
				{top}
				{/* Both panels stay mounted: switching keeps the shop's filters and scroll. */}
				<Tabs defaultValue="stats">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="stats" className="h-11">
							Stats
						</TabsTrigger>
						<TabsTrigger value="shop" className="h-11">
							Shop
						</TabsTrigger>
						<TabsTrigger
							value="runes"
							className="h-11"
							onPointerEnter={onRunesIntent}
							onPointerDown={onRunesIntent}
							onFocus={onRunesIntent}
						>
							Runes
						</TabsTrigger>
					</TabsList>
					<TabsContent value="stats" keepMounted>
						{stats}
					</TabsContent>
					<TabsContent value="shop" keepMounted>
						{shop}
					</TabsContent>
					<TabsContent value="runes">{runes}</TabsContent>
				</Tabs>
			</div>
			<div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-primary-2 border-t bg-primary-4 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),--spacing(3))]">
				{bottom}
			</div>
		</main>
	)
}
