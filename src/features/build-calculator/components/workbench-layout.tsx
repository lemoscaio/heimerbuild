import { cn } from "@/lib/cn"
import { WorkbenchPanel } from "./workbench-panel"

type WorkbenchLayoutProps = {
	/** The page actions (copy link), in a bar above the columns, on the right. */
	actions?: React.ReactNode
	/** Left column: champion, level and build slots. */
	build: React.ReactNode
	/** Center column, in a panel of the full height: its content scrolls on its own. */
	shop: React.ReactNode
	/** Right column: the stats. */
	stats: React.ReactNode
} & Omit<React.ComponentProps<"main">, "children">

/** The champion page: three columns that fill the viewport from `lg` up, stacked below it. */
export function WorkbenchLayout({
	actions,
	build,
	shop,
	stats,
	className,
	...props
}: WorkbenchLayoutProps) {
	return (
		<main
			className={cn(
				"min-h-screen bg-primary-3 pt-header text-sm text-white lg:grid lg:h-dvh lg:min-h-0 lg:grid-cols-[17.5rem_minmax(0,1fr)_21.25rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-5 lg:gap-y-3 lg:bg-primary-4 lg:px-5 lg:pt-[calc(var(--spacing-header)+--spacing(5))] lg:pb-5",
				className,
			)}
			{...props}
		>
			<div className="flex items-start justify-end bg-primary-3 px-4 pt-3 empty:hidden lg:col-span-3 lg:min-h-9 lg:bg-transparent lg:p-0 lg:empty:block">
				{actions}
			</div>
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
