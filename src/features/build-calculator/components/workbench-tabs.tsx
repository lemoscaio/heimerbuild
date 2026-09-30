import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type WorkbenchTab = "items" | "runes"

type WorkbenchTabsProps = {
	tab: WorkbenchTab
	onTabChange: (tab: WorkbenchTab) => void
	items: React.ReactNode
	runes: React.ReactNode
	/** Hover, focus or touch on the Runes tab, before it opens (preloads its images). */
	onRunesIntent?: () => void
}

/** The overview's center column: Items | Runes. */
export function WorkbenchTabs({
	tab,
	onTabChange,
	items,
	runes,
	onRunesIntent,
}: WorkbenchTabsProps) {
	return (
		<Tabs
			value={tab}
			onValueChange={(value: WorkbenchTab) => onTabChange(value)}
			className="min-h-0 flex-1"
		>
			<TabsList className="shrink-0">
				<TabsTrigger value="items" className="px-5">
					Items
				</TabsTrigger>
				<TabsTrigger
					value="runes"
					className="px-5"
					onPointerEnter={onRunesIntent}
					onPointerDown={onRunesIntent}
					onFocus={onRunesIntent}
				>
					Runes
				</TabsTrigger>
			</TabsList>
			{/* The shop stays mounted: switching keeps its filters and scroll. */}
			<TabsContent value="items" keepMounted className="flex min-h-0 flex-col">
				{items}
			</TabsContent>
			<TabsContent
				value="runes"
				className="scrollbar-purple min-h-0 overflow-y-auto pr-1"
			>
				{runes}
			</TabsContent>
		</Tabs>
	)
}
