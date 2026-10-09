import { useRouter } from "@tanstack/react-router"
import { LoadError } from "@/components/common/load-error"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/cn"
import { useStatsMockupsPage } from "./hooks/use-stats-mockups-page"
import { MOCKUP_OPTIONS, type MockupOption } from "./lib/mockup-search"
import { MockupControls } from "./mockup-controls"
import { OptionBars } from "./option-bars"
import { OptionColumns } from "./option-columns"
import { OptionExpand } from "./option-expand"
import { OptionSources } from "./option-sources"

const OPTION_TITLES: Readonly<Record<MockupOption, string>> = {
	expand: "Option 1 · Totals, tap for the composition",
	columns: "Option 2 · Base | Bonus | Total",
	bars: "Option 3 · Source bars",
	sources: "Option 4 · Totals, tap to open, show sources",
}

/** Prototype for issue 428 (not for merge): the Stats panel options side by side on real builds. */
export function StatsMockupsPage() {
	const page = useStatsMockupsPage()
	const { status, stats, groups, option } = page
	const router = useRouter()
	const optionProps = groups && {
		groups,
		previewLabel: stats?.preview?.label,
		comparison: stats?.compared,
	}

	return (
		<main className="min-h-screen bg-surface-sunken px-4 pt-[calc(var(--spacing-header)+--spacing(5))] pb-10 text-sm text-white lg:px-4">
			<div className="mx-auto flex max-w-352 flex-col gap-5">
				<MockupIntro />
				<MockupControls
					buildId={page.buildId}
					onBuildChange={page.setBuild}
					forms={page.champion?.forms}
					form={page.form}
					onFormChange={page.setForm}
					preview={page.preview}
					previewItemName={page.previewItemName}
					onPreviewChange={page.setPreview}
				/>
				<ToggleGroup
					aria-label="Option"
					className="gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.75 lg:hidden"
					value={[option]}
					onValueChange={([next]) => next && page.setOption(next)}
				>
					{MOCKUP_OPTIONS.map((id, index) => (
						<ToggleGroupItem
							key={id}
							value={id}
							className="h-auto min-h-11 flex-1 rounded-md font-semibold text-prose data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:text-surface-sunken"
						>
							Option {index + 1}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
				{status === "error" && (
					<LoadError onRetry={() => router.invalidate()}>
						Could not load the game data.
					</LoadError>
				)}
				{status === "pending" && <Skeleton className="h-96 w-full" />}
				{optionProps && (
					<div className="grid gap-5 lg:grid-cols-[repeat(auto-fill,21.25rem)] lg:justify-center lg:gap-3">
						<MockupPanel
							title={OPTION_TITLES.expand}
							shown={option === "expand"}
						>
							<OptionExpand {...optionProps} />
						</MockupPanel>
						<MockupPanel
							title={OPTION_TITLES.columns}
							shown={option === "columns"}
						>
							<OptionColumns {...optionProps} />
						</MockupPanel>
						<MockupPanel title={OPTION_TITLES.bars} shown={option === "bars"}>
							<OptionBars {...optionProps} />
						</MockupPanel>
						<MockupPanel
							id="option-4"
							title={OPTION_TITLES.sources}
							shown={option === "sources"}
						>
							<OptionSources {...optionProps} />
						</MockupPanel>
					</div>
				)}
			</div>
		</main>
	)
}

function MockupIntro() {
	return (
		<header className="flex flex-col gap-1.5">
			<h1 className="font-bold font-display text-xl">Stats panel mockups</h1>
			<p className="max-w-3xl text-subtle text-xs leading-5">
				Prototype for issue 428, not for merge. Option 4 joins Option 1's rows
				with Option 3's sources (owner's feedback). Every number comes from the
				stats engine on the current patch. Each source's part is found by
				subtraction (the totals as each source joins), so the parts always add
				up; where sources interact (attack speed multipliers, Rabadon's 30%,
				Adaptive Force) the later source carries the interaction. Jinx has Rev'd
				up on, at full stacks, to show an effect.
			</p>
		</header>
	)
}

type MockupPanelProps = {
	title: string
	/** Below `lg`, only the picked option shows. */
	shown: boolean
} & React.ComponentProps<"section">

function MockupPanel({
	title,
	shown,
	className,
	children,
	...props
}: MockupPanelProps) {
	return (
		<section
			aria-label={title}
			className={cn(
				"flex flex-col gap-3 rounded-xl border border-line bg-surface p-4",
				{ "max-lg:hidden": !shown },
				className,
			)}
			{...props}
		>
			<h2 className="font-semibold text-lilac text-xs uppercase tracking-widest">
				{title}
			</h2>
			{children}
		</section>
	)
}
