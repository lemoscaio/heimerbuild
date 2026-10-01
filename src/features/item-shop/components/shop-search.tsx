import type { Item } from "@schemas/item"
import { Fragment, useRef } from "react"
import { GameIcon } from "@/components/common/game-icon"
import {
	Combobox,
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox"
import { track } from "@/lib/analytics/analytics"
import { cn } from "@/lib/cn"
import { useSearchCompletion } from "../hooks/use-search-completion"
import { useSearchHandoff } from "../hooks/use-search-handoff"
import { useSearchKeys } from "../hooks/use-search-keys"
import { useSearchShortcut } from "../hooks/use-search-shortcut"
import { useSuggestionsPopup } from "../hooks/use-suggestions-popup"
import { applyMoreFilter, type MoreFilter } from "../lib/more-filters"
import type { ShopCatalog } from "../lib/shop-catalog"
import {
	commitShopQuery,
	filtersFromTokens,
	type ShopFilters,
} from "../lib/shop-query"
import {
	pickSuggestions,
	type Suggestion,
	shopSuggestions,
	suggestionKey,
	suggestionKindLabel,
	suggestionText,
	type TextSuggestion,
} from "../lib/shop-suggestions"
import { MoreFiltersMenu } from "./more-filters-menu"

export type ShopSearchChange = { query: string; filters: ShopFilters }

type ShopSearchProps = {
	/** Free text, matched against item names. */
	query: string
	filters: ShopFilters
	/** The items the shop shows; the ones matching the text are suggested. */
	items: readonly Item[]
	/** The item names and the terms built from the items (`group:`, `from:`, `into:`). */
	catalog: ShopCatalog
	onSearchChange: (change: ShopSearchChange) => void
	/** An item suggestion was picked: the shop selects it. */
	onItemPick: (itemId: string) => void
	/** Escape pressed in the input; the shop clears the text and moves focus to the items. */
	onEscape: () => void
	className?: string
}

/**
 * The shop search: free text for item names, plus tokens. `ap`, `role:tank` and `or` drive the
 * same filters as the role row and the stat rail, so both always show the same state; the
 * conditions (`has:active`, `from:sheen`, `ap>=80`, `gold<=1500`) exist only here.
 */
export function ShopSearch({
	query,
	filters,
	items,
	catalog,
	onSearchChange,
	onItemPick,
	onEscape,
	className,
}: ShopSearchProps) {
	const inputRef = useRef<HTMLInputElement>(null)
	const anchorRef = useRef<HTMLDivElement>(null)
	const popup = useSuggestionsPopup()
	const completion = useSearchCompletion(inputRef)
	useSearchShortcut(inputRef)
	const handoff = useSearchHandoff(inputRef)

	const { chips, suggestions } = shopSuggestions({
		query,
		filters,
		items,
		catalog,
	})
	const statChips = chips.filter(({ token }) => token.kind === "stat")
	const lastStatChip = statChips.at(-1)

	function commit(text: string, options?: { includeLastWord?: boolean }) {
		const { tokens, text: rest } = commitShopQuery(text, {
			...options,
			catalog,
		})
		onSearchChange({
			query: rest,
			filters: tokens.length
				? filtersFromTokens(
						[...chips.map(({ token }) => token), ...tokens],
						filters,
					)
				: filters,
		})
	}

	function handleValueChange(
		next: Suggestion[],
		{ reason }: { reason: string },
	) {
		const { picked, ...change } = pickSuggestions(next, {
			chips,
			query,
			filters,
			catalog,
		})
		if (picked && picked.kind !== "text" && reason === "item-press") {
			trackPick(picked)
		}
		if (picked?.kind === "item") onItemPick(picked.item.id)
		if (picked?.kind === "shortcut") {
			// A prefix needs its value: typed in, it shows its values with the first highlighted.
			popup.keepOpenAfterPick()
			queueMicrotask(() => completion.complete(change.query))
			return
		}
		onSearchChange(change)
	}

	function trackPick(picked: PickedSuggestion) {
		const position =
			suggestions.findIndex(
				(suggestion) => suggestionKey(suggestion) === suggestionKey(picked),
			) + 1
		track("shop_search_suggestion_picked", {
			...pickedValue(picked),
			position,
		})
	}

	function handleMoreFilter(filter: MoreFilter) {
		const change = applyMoreFilter(filter, { query, filters })
		// A filter that needs a value is completed in the search, like a picked prefix.
		if (filter.kind === "shortcut") {
			handoff.handOff(() => completion.complete(change.query))
		} else {
			onSearchChange(change)
		}
	}

	const keys = useSearchKeys({
		isOpen: popup.isOpen,
		query,
		filters,
		onSearchChange,
		onCommit: () => commit(query, { includeLastWord: true }),
		onEscape,
		complete: completion.complete,
	})

	return (
		<>
			<Combobox<Suggestion, true>
				multiple
				items={suggestions}
				filter={null}
				value={chips}
				onValueChange={handleValueChange}
				inputValue={query}
				onInputValueChange={(text, { reason }) => {
					// Picking a suggestion clears the input; `handleValueChange` already set the text.
					if (reason !== "item-press" && reason !== "input-clear") commit(text)
				}}
				open={popup.isOpen}
				onOpenChange={popup.onOpenChange}
				autoHighlight
				isItemEqualToValue={(a, b) => suggestionKey(a) === suggestionKey(b)}
				itemToStringLabel={suggestionText}
			>
				<ComboboxChips
					ref={anchorRef}
					className={cn("min-h-9 max-lg:min-h-11", className)}
				>
					{chips.map((chip) => (
						<Fragment key={chip.key}>
							<ComboboxChip
								aria-label={chip.label}
								removeLabel={`Remove ${chip.label}`}
							>
								{chip.term}
							</ComboboxChip>
							{chip.token.kind === "stat" && chip !== lastStatChip && (
								<span
									aria-hidden="true"
									className="font-bold text-[0.625rem] text-gold"
								>
									{filters.match === "all" ? "AND" : "OR"}
								</span>
							)}
						</Fragment>
					))}
					<ComboboxChipsInput
						ref={inputRef}
						aria-label="Search items"
						aria-keyshortcuts="/"
						placeholder={
							chips.length ? "" : "Search items, ap, role:tank, gold<=1500…"
						}
						className="max-lg:h-9"
						onKeyDown={keys.onKeyDown}
					/>
					{!query && !chips.length && (
						<kbd
							aria-hidden
							className="pointer-events-none rounded-sm border border-primary-1 px-1.5 font-mono text-subtle text-xs max-lg:hidden"
						>
							/
						</kbd>
					)}
				</ComboboxChips>
				<span className="sr-only" aria-live="polite">
					{keys.editing
						? `Editing ${keys.editing}`
						: !!chips.length &&
							`Filters: ${chips.map(({ label }) => label).join(", ")}`}
				</span>
				<ComboboxContent
					anchor={anchorRef}
					className="min-w-[min(20rem,var(--available-width))]"
				>
					<ComboboxEmpty>
						Type a stat (ap, ap&gt;=80), a role (role:tank), a filter
						(has:active, from:sheen, gold&lt;=1500), and / or, or an item name.
					</ComboboxEmpty>
					<ComboboxList aria-label="Suggestions">
						{(suggestion: Suggestion) => (
							<SuggestionRow
								key={suggestionKey(suggestion)}
								suggestion={suggestion}
							/>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
			<MoreFiltersMenu
				className="max-lg:size-11"
				finalFocus={handoff.finalFocus}
				onPick={handleMoreFilter}
			/>
		</>
	)
}

/** A pick analytics records; the name search is the plain Enter it always was. */
type PickedSuggestion = Exclude<Suggestion, TextSuggestion>

/** What a pick sends to analytics: a token's value, the item id or the shortcut's prefix. */
function pickedValue(picked: PickedSuggestion) {
	switch (picked.kind) {
		case "item":
			return { kind: "item" as const, value: picked.item.id }
		case "shortcut":
			return { kind: "shortcut" as const, value: picked.text }
		case "token":
			return picked.value
	}
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
	return (
		<ComboboxItem value={suggestion}>
			<span className="w-12 shrink-0 font-semibold text-[0.6875rem] text-gold">
				{suggestionKindLabel(suggestion)}
			</span>
			<SuggestionContent suggestion={suggestion} />
		</ComboboxItem>
	)
}

function SuggestionContent({ suggestion }: { suggestion: Suggestion }) {
	switch (suggestion.kind) {
		case "text":
			return <FilterContent label={`Name contains "${suggestion.text}"`} />
		case "item":
			return (
				<>
					<GameIcon
						src={suggestion.item.icon}
						name={suggestion.item.name}
						width={20}
						height={20}
						className="size-5 rounded-xs"
					/>
					<span className="min-w-0 truncate">{suggestion.item.name}</span>
				</>
			)
		case "token":
			return (
				<FilterContent
					icon={suggestion.icon}
					label={suggestion.label}
					term={suggestion.term}
				/>
			)
		case "shortcut":
			return (
				<FilterContent label={`${suggestion.label}…`} term={suggestion.text} />
			)
	}
}

function FilterContent({
	icon,
	label,
	term,
}: {
	icon?: string
	label: string
	term?: string
}) {
	return (
		<>
			{icon ? (
				<img src={icon} alt="" className="size-5" />
			) : (
				<span className="size-5" />
			)}
			{/* On phones the term goes under the label, so long item names stay readable. */}
			<span className="flex min-w-0 flex-1 items-center max-lg:flex-col max-lg:items-start">
				<span className="min-w-0 max-w-full truncate">{label}</span>
				{!!term && (
					<span className="max-w-full shrink-0 truncate font-mono text-subtle text-xs lg:ml-auto lg:pl-2">
						{term}
					</span>
				)}
			</span>
		</>
	)
}
