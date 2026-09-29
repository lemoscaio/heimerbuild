import { cn } from "@/lib/cn"
import { WorkbenchPanel } from "./workbench-panel"

type WorkbenchLayoutProps = {
	/** Left column: champion, level and build slots. */
	build: React.ReactNode
	/** Center column, in a panel of the full height: its content scrolls on its own. */
	shop: React.ReactNode
	/** Right column: the stats. */
	stats: React.ReactNode
} & Omit<React.ComponentProps<"main">, "children">

/** The champion page: three columns that fill the viewport from `lg` up, stacked below it. */
export function WorkbenchLayout({
	build,
	shop,
	stats,
	className,
	...props
}: WorkbenchLayoutProps) {
	return (
		<main
			className={cn(
				"min-h-screen bg-primary-3 pt-header text-sm text-white lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[17.5rem_minmax(0,1fr)_21.25rem] lg:grid-rows-[minmax(0,1fr)] lg:gap-5 lg:bg-primary-4 lg:px-5 lg:pt-[calc(var(--spacing-header)+--spacing(5))] lg:pb-5",
				className,
			)}
			{...props}
		>
			<WorkbenchColumn>{build}</WorkbenchColumn>
			<WorkbenchPanel className="flex flex-col lg:min-h-0">
				{shop}
			</WorkbenchPanel>
			<WorkbenchColumn>{stats}</WorkbenchColumn>
		</main>
	)
}

function WorkbenchColumn({ children }: React.PropsWithChildren) {
	return (
		<div className="scrollbar-purple flex flex-col lg:min-h-0 lg:gap-4 lg:overflow-y-auto">
			{children}
		</div>
	)
}
