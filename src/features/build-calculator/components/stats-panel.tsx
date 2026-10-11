import { cva } from "class-variance-authority"
import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/cn"
import { useStatsPanel } from "../hooks/use-stats-panel"
import type {
	CompareColumn,
	ComposedStats,
	StatsRowsInput,
} from "../lib/stats-rows"
import { compareColumn } from "./compare-column"
import { SourceBar } from "./source-bar"
import { SourceLegend } from "./source-legend"
import { StatRow } from "./stat-row"
import { SourcesReveal } from "./stats-panel.motion"

// Two value columns need wider groups on a tablet, so the groups take two columns there.
const statGroupsGrid = cva("grid gap-x-4 gap-y-3 lg:grid-cols-1", {
	variants: {
		compared: { true: "md:grid-cols-2", false: "md:grid-cols-3" },
	},
})

type StatsPanelProps = Omit<StatsRowsInput, "preview"> & {
	/** Stats with a candidate change (an item, the stat shards): changed rows show `current → next`. */
	preview?: ComposedStats & { label: string }
	/** Notes under the stat groups. */
	children?: React.ReactNode
}

/**
 * The build's stats by group. Each row shows its total and opens its breakdown by source; "Show
 * sources" adds a bar and a line by kind of source under every row, and a champion with forms can
 * compare each total with the other form's.
 */
export function StatsPanel({ children, ...input }: StatsPanelProps) {
	const { preview, formComparison } = input
	const panel = useStatsPanel(input)
	const { comparedName, columns, showSources } = panel

	return (
		<section className="flex flex-col gap-3" aria-label="Champion stats">
			<div className="flex items-baseline justify-between gap-2">
				<h2 className="font-bold font-display text-base">Stats</h2>
				{preview && (
					<span className="truncate text-subtle text-xs">
						preview with <span className="text-lilac">{preview.label}</span>
					</span>
				)}
			</div>
			{/* The legend's gap sits inside its reveal: a flex gap would snap in and out with it. */}
			<div className="-mt-2">
				<div className="flex flex-wrap gap-x-4">
					<PanelSwitch
						checked={showSources}
						onCheckedChange={panel.setShowSources}
					>
						Show sources
					</PanelSwitch>
					{formComparison && (
						<PanelSwitch
							checked={panel.compare}
							onCheckedChange={panel.setCompare}
						>
							Compare {formComparison.formName} with{" "}
							{formComparison.comparedName}
						</PanelSwitch>
					)}
				</div>
				<SourcesReveal open={showSources}>
					<div className="pt-3">
						<SourceLegend comparedName={comparedName} />
					</div>
				</SourcesReveal>
			</div>
			<div className={statGroupsGrid({ compared: !!columns })}>
				{panel.groups.map(({ group, label, rows }) => (
					<div key={group}>
						<div className="flex items-end gap-2 pb-1">
							<h3 className="flex-1 font-semibold text-gold text-xs uppercase tracking-widest">
								{label}
							</h3>
							{columns && <CompareColumns columns={columns} />}
						</div>
						<ul className="flex flex-col gap-0.5">
							{rows.map((row) => (
								<StatRow key={row.info.stat} row={row} columns={columns}>
									<SourcesReveal open={showSources} render={<span />}>
										<SourceBar row={row} comparedName={comparedName} />
									</SourcesReveal>
								</StatRow>
							))}
						</ul>
					</div>
				))}
			</div>
			{children}
		</section>
	)
}

type PanelSwitchProps = React.PropsWithChildren<{
	checked: boolean
	onCheckedChange: (checked: boolean) => void
}>

function PanelSwitch({ checked, onCheckedChange, children }: PanelSwitchProps) {
	const switchId = useId()

	return (
		<div className="flex min-h-9 items-center gap-2.5 text-prose text-xs">
			<Switch
				id={switchId}
				checked={checked}
				onCheckedChange={onCheckedChange}
			/>
			<label htmlFor={switchId} className="cursor-pointer">
				{children}
			</label>
		</div>
	)
}

/** Names the two forms' value columns while the forms are compared; a long name wraps. */
function CompareColumns({ columns }: { columns: CompareColumn[] }) {
	return (
		<span
			aria-hidden="true"
			className="flex items-end gap-2 self-end pr-5.5 text-[0.625rem] uppercase leading-3 tracking-wide"
		>
			{columns.map(({ name, selected }) => (
				<span
					key={name}
					className={cn(
						compareColumn({ column: selected ? "selected" : "compared" }),
						// Medium, not bold, so a two-word name fits one line in the narrow desktop panel.
						"text-balance font-medium",
					)}
				>
					{name}
				</span>
			))}
		</span>
	)
}
