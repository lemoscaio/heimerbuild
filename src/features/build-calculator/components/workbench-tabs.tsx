import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type WorkbenchTab = "items" | "runes"

type WorkbenchTabsProps = {
	tab: WorkbenchTab
	onTabChange: (tab: WorkbenchTab) => void
	items: React.ReactNode
	/** Without it (expanded shop), only the items panel shows, with no tab list. */
	runes?: React.ReactNode
}

/**
 * The center column: Items | Runes in the overview, the items alone in the expanded shop.
 * Both views render the shop at the same place in the tree, so switching keeps its state and focus.
 */
export function WorkbenchTabs({
	tab,
	onTabChange,
	items,
	runes,
}: WorkbenchTabsProps) {
	return (
		<Tabs
			value={runes ? tab : "items"}
			onValueChange={(value: WorkbenchTab) => onTabChange(value)}
			className="min-h-0 flex-1"
		>
			{!!runes && (
				<TabsList className="shrink-0">
					<TabsTrigger value="items" className="px-5">
						Items
					</TabsTrigger>
					<TabsTrigger value="runes" className="px-5">
						Runes
					</TabsTrigger>
				</TabsList>
			)}
			{/* The shop stays mounted: switching keeps its filters and scroll. */}
			<TabsContent value="items" keepMounted className="flex min-h-0 flex-col">
				{items}
			</TabsContent>
			{!!runes && (
				<TabsContent
					value="runes"
					className="scrollbar-purple min-h-0 overflow-y-auto pr-1"
				>
					{runes}
				</TabsContent>
			)}
		</Tabs>
	)
}
