import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type MobileTab = "stats" | "shop" | "runes" | "skills"

type MobileLayoutProps = {
	/** Champion, level and build slots, above the tabs. */
	top: React.ReactNode
	tab: MobileTab
	onTabChange: (tab: MobileTab) => void
	stats: React.ReactNode
	shop: React.ReactNode
	runes: React.ReactNode
	skills: React.ReactNode
	/** Touch or focus on the Runes tab, before it opens (preloads its images). */
	onRunesIntent?: () => void
	/** Pinned to the bottom of the screen: item details and page actions. */
	bottom: React.ReactNode
}

/** The champion page below `lg`: the build on top, then Stats | Shop | Runes | Skills tabs. */
export function MobileLayout({
	top,
	tab,
	onTabChange,
	stats,
	shop,
	runes,
	skills,
	onRunesIntent,
	bottom,
}: MobileLayoutProps) {
	return (
		<main className="flex min-h-screen flex-col bg-surface px-4 pt-[calc(var(--spacing-header)+--spacing(4))] text-sm text-white">
			<div className="flex flex-1 flex-col gap-4 pb-4">
				{top}
				{/* Both panels stay mounted: switching keeps the shop's filters and scroll. */}
				<Tabs
					value={tab}
					onValueChange={(value: MobileTab) => onTabChange(value)}
				>
					<TabsList className="grid w-full grid-cols-4">
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
						<TabsTrigger value="skills" className="h-11">
							Skills
						</TabsTrigger>
					</TabsList>
					<TabsContent value="stats" keepMounted>
						{stats}
					</TabsContent>
					<TabsContent value="shop" keepMounted>
						{shop}
					</TabsContent>
					<TabsContent value="runes">{runes}</TabsContent>
					<TabsContent value="skills">{skills}</TabsContent>
				</Tabs>
			</div>
			{/* Sticky, not fixed: it parks at the end of the page, so the site footer below stays visible. */}
			<div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-line border-t bg-surface-sunken px-4 pt-3 pb-[max(env(safe-area-inset-bottom),--spacing(3))]">
				{bottom}
			</div>
		</main>
	)
}
