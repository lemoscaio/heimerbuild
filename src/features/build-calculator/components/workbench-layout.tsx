import { cva } from "class-variance-authority"
import { cn } from "@/lib/cn"
import type { BuildView } from "../lib/build-search"
import { WorkbenchPanel } from "./workbench-panel"

const workbench = cva(
	"min-h-screen bg-surface pt-header text-sm text-white lg:grid lg:h-dvh lg:min-h-0 lg:bg-surface-sunken",
	{
		variants: {
			view: {
				overview:
					"lg:grid-cols-[17.5rem_minmax(0,1fr)_21.25rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-5 lg:gap-y-3 lg:px-5 lg:pt-[calc(var(--spacing-header)+--spacing(5))] lg:pb-5",
				shop: "lg:grid-cols-[minmax(0,1fr)_22.5rem] lg:grid-rows-[auto_minmax(0,1fr)_auto]",
			} satisfies Record<BuildView, string>,
		},
	},
)

const actionsBar = cva(
	"flex items-start justify-end bg-surface px-4 pt-3 empty:hidden lg:min-h-9 lg:empty:block",
	{
		variants: {
			view: {
				overview: "lg:col-span-3 lg:bg-transparent lg:p-0",
				shop: "lg:col-span-2 lg:border-line lg:border-b lg:bg-surface-sunken lg:px-5 lg:py-2",
			} satisfies Record<BuildView, string>,
		},
	},
)

// The expanded shop is no card: it fills its column edge to edge.
const shopPanel = cva("flex flex-col lg:min-h-0", {
	variants: {
		view: {
			overview: "",
			shop: "bg-surface-sunken p-0 lg:rounded-none lg:border-0 lg:p-0",
		} satisfies Record<BuildView, string>,
	},
})

const sideColumn = cva("", {
	variants: {
		view: {
			overview: "",
			shop: "border-line px-4 py-5 lg:border-l lg:p-5",
		} satisfies Record<BuildView, string>,
	},
})

type WorkbenchLayoutProps = {
	/** The page actions (copy link), in a bar above the columns, on the right. */
	actions?: React.ReactNode
	/** `shop`: the expanded shop, with `bar` under the shop and details. */
	view?: BuildView
	/** Left column (overview only): champion, level and build slots. */
	build?: React.ReactNode
	/** Center column, in a panel of the full height: its content scrolls on its own. */
	shop: React.ReactNode
	/** Right column: the stats, or the item details in the expanded shop. */
	side: React.ReactNode
	/** Bottom bar of the expanded shop. */
	bar?: React.ReactNode
} & Omit<React.ComponentProps<"main">, "children">

/** The champion page: columns that fill the viewport from `lg` up, stacked below it. */
export function WorkbenchLayout({
	actions,
	view = "overview",
	build,
	shop,
	side,
	bar,
	className,
	...props
}: WorkbenchLayoutProps) {
	const isShop = view === "shop"

	return (
		<main className={cn(workbench({ view }), className)} {...props}>
			<div className={actionsBar({ view })}>{actions}</div>
			{!isShop && <WorkbenchColumn>{build}</WorkbenchColumn>}
			<WorkbenchPanel className={shopPanel({ view })}>{shop}</WorkbenchPanel>
			<WorkbenchColumn className={sideColumn({ view })}>{side}</WorkbenchColumn>
			{isShop && <div className="lg:col-span-2">{bar}</div>}
		</main>
	)
}

function WorkbenchColumn({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"scrollbar-purple flex flex-col lg:min-h-0 lg:gap-4 lg:overflow-y-auto",
				className,
			)}
			{...props}
		/>
	)
}
