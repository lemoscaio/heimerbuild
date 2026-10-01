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
import { useSearchShortcut } from "../hooks/use-search-shortcut"
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
} from "../lib/shop-suggestions"

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
	const highlightedRef = useRef<Suggestion>(undefined)
	const isOpenRef = useRef(false)
	useSearchShortcut(inputRef)

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
		})
		if (picked && reason === "item-press") trackPick(picked)
		if (picked?.kind === "item") onItemPick(picked.item.id)
		onSearchChange(change)
	}

	function trackPick(picked: Suggestion) {
		const position =
			suggestions.findIndex(
				(suggestion) => suggestionKey(suggestion) === suggestionKey(picked),
			) + 1
		track("shop_search_suggestion_picked", {
			...pickedValue(picked),
			position,
		})
	}

	function handleKeyDown(
		event: React.KeyboardEvent<HTMLInputElement> & {
			preventBaseUIHandler?: () => void
		},
	) {
		// A first Escape closes the suggestions; with them closed, Escape clears the text only
		// (the combobox would also clear the tokens) and moves to the items.
		if (event.key === "Escape" && !isOpenRef.current) {
			event.preventBaseUIHandler?.()
			event.preventDefault()
			onEscape()
		} else if (
			(event.key === "Enter" && !highlightedRef.current) ||
			event.key === "Tab"
		) {
			commit(query, { includeLastWord: true })
		}
	}

	return (
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
			onOpenChange={(open) => {
				isOpenRef.current = open
			}}
			onItemHighlighted={(suggestion) => {
				highlightedRef.current = suggestion
			}}
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
					onKeyDown={handleKeyDown}
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
				{!!chips.length &&
					`Filters: ${chips.map(({ label }) => label).join(", ")}`}
			</span>
			<ComboboxContent
				anchor={anchorRef}
				className="min-w-[min(20rem,var(--available-width))]"
			>
				<ComboboxEmpty>
					Type a stat (ap, ap&gt;=80), a role (role:tank), a filter (has:active,
					from:sheen, gold&lt;=1500), and / or, or an item name.
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
	)
}

/** What a pick sends to analytics: a token's value, the item id or the shortcut's prefix. */
function pickedValue(picked: Suggestion) {
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
	term: string
}) {
	return (
		<>
			{icon ? (
				<img src={icon} alt="" className="size-5" />
			) : (
				<span className="size-5" />
			)}
			<span className="min-w-0 truncate">{label}</span>
			<span className="ml-auto shrink-0 pl-2 font-mono text-subtle text-xs">
				{term}
			</span>
		</>
	)
}
