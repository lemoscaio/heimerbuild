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
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { useSearchShortcut } from "../hooks/use-search-shortcut"
import {
	commitShopQuery,
	filtersFromTokens,
	type ShopFilters,
	type ShopToken,
	suggestShopTokens,
	tokenKey,
	tokenLabel,
	tokensFromFilters,
	tokenTerm,
	tokenValue,
	typedWord,
	withoutTypedWord,
} from "../lib/shop-query"

type Suggestion =
	| {
			kind: "token"
			token: ShopToken
			term: string
			label: string
			icon?: string
	  }
	| { kind: "item"; item: Item }

export type ShopSearchChange = { query: string; filters: ShopFilters }

type ShopSearchProps = {
	/** Free text, matched against item names. */
	query: string
	filters: ShopFilters
	/** The items the shop shows; the ones matching the text are suggested. */
	items: readonly Item[]
	/** Every item name: an alias that continues the start of one stays free text. */
	itemNames: readonly string[]
	onSearchChange: (change: ShopSearchChange) => void
	/** An item suggestion was picked: the shop selects it. */
	onItemPick: (itemId: string) => void
	/** Escape pressed in the input; the shop clears the text and moves focus to the items. */
	onEscape: () => void
	className?: string
}

const ITEM_SUGGESTIONS = 4

/**
 * The shop search: free text for item names, plus tokens (`ap`, `role:tank`, `or`) that drive
 * the same filters as the role row and the stat rail, so both always show the same state.
 */
export function ShopSearch({
	query,
	filters,
	items,
	itemNames,
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

	const chips = tokensFromFilters(filters).map(tokenSuggestion)
	const matchToken: ShopToken = { kind: "match", match: filters.match }
	const suggestions: Suggestion[] = [
		...suggestShopTokens(typedWord(query), {
			active: [...chips.map(({ token }) => token), matchToken],
		}).map(({ token, term, label, icon }) => ({
			kind: "token" as const,
			token,
			term,
			label,
			icon,
		})),
		...(query.trim() ? items.slice(0, ITEM_SUGGESTIONS) : []).map((item) => ({
			kind: "item" as const,
			item,
		})),
	]
	const statChips = chips.filter(({ token }) => token.kind === "stat")
	const lastStatChip = statChips.at(-1)

	function commit(text: string, options?: { includeLastWord?: boolean }) {
		const { tokens, text: rest } = commitShopQuery(text, {
			...options,
			itemNames,
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
		const chipKeys = new Set(chips.map(suggestionKey))
		const picked = next.find(
			(suggestion) => !chipKeys.has(suggestionKey(suggestion)),
		)
		if (picked && reason === "item-press") trackPick(picked)
		if (picked?.kind === "item") onItemPick(picked.item.id)
		const tokens = next.flatMap((suggestion) =>
			suggestion.kind === "token" ? [suggestion.token] : [],
		)
		const isTokenPicked = tokens.some(
			(token) =>
				!chips.some((chip) => tokenKey(chip.token) === tokenKey(token)),
		)
		onSearchChange({
			query: isTokenPicked ? withoutTypedWord(query) : query,
			filters: filtersFromTokens(tokens, filters),
		})
	}

	function trackPick(picked: Suggestion) {
		const position =
			suggestions.findIndex(
				(suggestion) => suggestionKey(suggestion) === suggestionKey(picked),
			) + 1
		track("shop_search_suggestion_picked", {
			...(picked.kind === "item"
				? { kind: "item", value: picked.item.id }
				: tokenValue(picked.token)),
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
					<Fragment key={tokenKey(chip.token)}>
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
					placeholder={chips.length ? "" : "Search items, ap, role:tank…"}
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
					Type a stat (ap, mr), a role (role:tank), and / or, or an item name.
				</ComboboxEmpty>
				<ComboboxList>
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

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
	return (
		<ComboboxItem value={suggestion}>
			<span className="w-10 shrink-0 font-semibold text-[0.6875rem] text-gold">
				{suggestionKind(suggestion)}
			</span>
			{suggestion.kind === "item" ? (
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
			) : (
				<>
					{suggestion.icon ? (
						<img src={suggestion.icon} alt="" className="size-5" />
					) : (
						<span className="size-5" />
					)}
					<span className="min-w-0 truncate">{suggestion.label}</span>
					<span className="ml-auto shrink-0 pl-2 font-mono text-subtle text-xs">
						{suggestion.term}
					</span>
				</>
			)}
		</ComboboxItem>
	)
}

function tokenSuggestion(token: ShopToken) {
	return {
		kind: "token" as const,
		token,
		term: tokenTerm(token),
		label: tokenLabel(token),
	}
}

function suggestionKind(suggestion: Suggestion) {
	if (suggestion.kind === "item") return "Item"
	switch (suggestion.token.kind) {
		case "stat":
			return "Stat"
		case "role":
			return "Role"
		case "match":
			return "Match"
	}
}

function suggestionKey(suggestion: Suggestion) {
	return suggestion.kind === "item"
		? `item:${suggestion.item.id}`
		: tokenKey(suggestion.token)
}

function suggestionText(suggestion: Suggestion) {
	return suggestion.kind === "item" ? suggestion.item.name : suggestion.label
}
