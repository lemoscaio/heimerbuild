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
			<ScrollingTabsContent value="runes">{runes}</ScrollingTabsContent>
			<ScrollingTabsContent value="skills">{skills}</ScrollingTabsContent>
			<ScrollingTabsContent value="combo">{combo}</ScrollingTabsContent>
		</Tabs>
	)
}

/** A tab panel that scrolls on its own, its edges faded while more lies beyond them. */
function ScrollingTabsContent({
	children,
	...props
}: React.ComponentProps<typeof TabsContent>) {
	return (
		<TabsContent tabIndex={-1} className="flex min-h-0 flex-col" {...props}>
			{/* The fade never finishes, and Base UI unmounts a closed panel only once its animations
			    do. The scroller also takes the panel's tab stop, so arrow keys still scroll it. */}
			<div
				// biome-ignore lint/a11y/noNoninteractiveTabindex: a scroller needs a tab stop to scroll by keyboard
				tabIndex={0}
				className="scrollbar-purple scroll-fade-content min-h-0 flex-1 overflow-y-auto pr-1 outline-none"
			>
				{children}
			</div>
		</TabsContent>
	)
}
