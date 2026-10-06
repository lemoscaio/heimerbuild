import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { BuildTab } from "../lib/build-search"

type WorkbenchTabsProps = {
	tab: BuildTab
	onTabChange: (tab: BuildTab) => void
	items: React.ReactNode
	runes: React.ReactNode
	skills: React.ReactNode
	combo: React.ReactNode
	/** Hover, focus or touch on the Runes tab, before it opens (preloads its images). */
	onRunesIntent?: () => void
}

/** The overview's center column: Items | Runes | Skills | Combo. */
export function WorkbenchTabs({
	tab,
	onTabChange,
	items,
	runes,
	skills,
	combo,
	onRunesIntent,
}: WorkbenchTabsProps) {
	return (
		<Tabs
			value={tab}
			onValueChange={(value: BuildTab) => onTabChange(value)}
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
				<TabsTrigger value="skills" className="px-5">
					Skills
				</TabsTrigger>
				<TabsTrigger value="combo" className="px-5">
					Combo
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
			<TabsContent
				value="skills"
				className="scrollbar-purple min-h-0 overflow-y-auto pr-1"
			>
				{skills}
			</TabsContent>
			<TabsContent
				value="combo"
				className="scrollbar-purple min-h-0 overflow-y-auto pr-1"
			>
				{combo}
			</TabsContent>
		</Tabs>
	)
}
