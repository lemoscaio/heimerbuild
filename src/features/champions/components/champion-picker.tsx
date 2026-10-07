import type { ChampionSummary } from "@schemas/champion"
import { cva } from "class-variance-authority"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { LoadError } from "@/components/common/load-error"
import { PoliteStatus } from "@/components/common/polite-status"
import { Input } from "@/components/ui/input"
import { useChampions } from "@/data/hooks/use-champions"
import { useChampionPicker } from "../hooks/use-champion-picker"
import { ChampionCardSkeleton } from "./champion-card"

const COLUMNS = { popover: 6, sheet: 4 } as const

type PickerLayout = keyof typeof COLUMNS

// A fixed height, so the popup keeps its size while the search narrows the grid.
const gridVariants = cva(
	"scrollbar-purple grid content-start gap-x-2 gap-y-3 overflow-y-auto p-1",
	{
		variants: {
			layout: {
				popover: "h-72 grid-cols-6",
				sheet: "h-[45dvh] grid-cols-4",
			},
		},
	},
)

const SKELETON_CELLS = Array.from({ length: 12 }, (_, index) => index)

type ChampionPickerProps = {
	/** The popup's title row (a popover or sheet title). */
	title: React.ReactNode
	/** The patch whose champions are offered. */
	patch: string
	/** The build's champion, not offered. */
	currentKey: string
	/** `popover` on desktop (6 columns, key hints), `sheet` on phones (4 columns). */
	layout: PickerLayout
	/** Under the grid, such as what a switch keeps and resets. */
	footer?: React.ReactNode
	/** The search field, which a popup focuses on open. */
	inputRef?: React.Ref<HTMLInputElement>
	onPick: (championKey: string) => void
}

/** The picker's content: a search field over a grid of champion portraits with their names. */
export function ChampionPicker({
	title,
	patch,
	currentKey,
	layout,
	footer,
	inputRef,
	onPick,
}: ChampionPickerProps) {
	const listId = useId()
	const championsQuery = useChampions(patch)
	const picker = useChampionPicker({
		champions: championsQuery.data,
		currentKey,
		columns: COLUMNS[layout],
		onPick,
	})
	const count = picker.options.length
	const countText = count
		? `${count} ${count === 1 ? "champion" : "champions"}`
		: "No champions found."

	return (
		<div className="flex flex-col gap-2.5 text-white">
			{title}
			<Input
				ref={inputRef}
				type="search"
				role="combobox"
				aria-label="Search a champion"
				aria-controls={listId}
				aria-expanded="true"
				aria-autocomplete="list"
				aria-activedescendant={
					picker.activeKey && picker.optionId(picker.activeKey)
				}
				placeholder="Search a champion"
				className="h-10 rounded-lg bg-surface-sunken px-3 text-white"
				value={picker.search}
				onChange={(event) => picker.setSearch(event.target.value)}
				onKeyDown={picker.onKeyDown}
			/>
			<p className="text-[11px] text-subtle">
				{championsQuery.isSuccess && countText}
				{layout === "popover" && (
					<span aria-hidden="true">
						{championsQuery.isSuccess && " · "}↑↓←→ move · Enter switches · Esc
						closes
					</span>
				)}
			</p>
			<PoliteStatus message={picker.search.trim() ? countText : ""} />
			<div
				id={listId}
				role="listbox"
				aria-label="Champions"
				aria-busy={championsQuery.isPending}
				className={gridVariants({ layout })}
			>
				{championsQuery.isPending &&
					SKELETON_CELLS.map((cell) => <ChampionCardSkeleton key={cell} />)}
				{picker.options.map((champion, index) => (
					<ChampionOption
						key={champion.key}
						id={picker.optionId(champion.key)}
						champion={champion}
						active={champion.key === picker.activeKey}
						onClick={() => onPick(champion.key)}
						onPointerEnter={() => picker.activate(index)}
					/>
				))}
			</div>
			{championsQuery.isError && (
				<LoadError onRetry={() => championsQuery.refetch()}>
					Could not load the champions.
				</LoadError>
			)}
			{footer}
		</div>
	)
}

type ChampionOptionProps = {
	champion: ChampionSummary
	/** The one Enter picks. */
	active: boolean
} & React.ComponentProps<"button">

function ChampionOption({ champion, active, ...props }: ChampionOptionProps) {
	return (
		<button
			type="button"
			role="option"
			aria-selected={active}
			tabIndex={-1}
			className="group flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-lg outline-none"
			{...props}
		>
			<GameIcon
				src={champion.icon}
				name={champion.name}
				width={120}
				height={120}
				loading="lazy"
				className="aspect-square w-full rounded-lg ring-1 ring-line transition group-hover:ring-lilac group-aria-selected:ring-2 group-aria-selected:ring-white"
			/>
			<span className="w-full truncate text-center text-[11px] text-prose group-aria-selected:text-white">
				{champion.name}
			</span>
		</button>
	)
}
