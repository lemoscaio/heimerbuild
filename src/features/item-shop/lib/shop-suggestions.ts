import type { Item } from "@schemas/item"
import { type FilterShortcut, suggestShortcuts } from "./filter-shortcuts"
import type { ShopCatalog } from "./shop-catalog"
import {
	commitShopQuery,
	describeToken,
	filtersFromTokens,
	nameSearchText,
	type ShopFilters,
	type ShopToken,
	suggestShopTokens,
	type TokenDescription,
	tokensFromFilters,
	typedWord,
	withoutTypedWord,
} from "./shop-query"

export type TokenSuggestion = {
	kind: "token"
	token: ShopToken
} & TokenDescription

export type ShortcutSuggestion = { kind: "shortcut" } & FilterShortcut

/** The name search Enter used to run on its own: the free text left once the tokens are out. */
export type TextSuggestion = { kind: "text"; text: string }

/** A row of the search's list, or a chip in the input (chips are token suggestions). */
export type Suggestion =
	| TextSuggestion
	| TokenSuggestion
	| ShortcutSuggestion
	| { kind: "item"; item: Item }

const ITEM_SUGGESTIONS = 4

type ShopSuggestionsInput = {
	/** The search text; its last word is the one being typed. */
	query: string
	filters: ShopFilters
	/** The items the shop shows; the first ones are suggested once there is text. */
	items: readonly Item[]
	catalog?: ShopCatalog
}

/**
 * The chips (the filters as tokens) and the list: the name search when the text names items,
 * tokens for the word being typed that are not applied yet, the filters it starts that need a
 * value (`from:`), then the first items the shop shows. The first row is highlighted, so the
 * name search leads: Enter on "zhon" keeps searching names instead of picking an item.
 */
export function shopSuggestions({
	query,
	filters,
	items,
	catalog,
}: ShopSuggestionsInput) {
	const chips = tokensFromFilters(filters).map(tokenSuggestion)
	const matchToken: ShopToken = { kind: "match", match: filters.match }
	const word = typedWord(query)
	const itemRows = nameSearchText(query) ? items.slice(0, ITEM_SUGGESTIONS) : []
	const { text } = commitShopQuery(query, { includeLastWord: true, catalog })
	const suggestions: Suggestion[] = [
		...(itemRows.length && nameSearchText(text)
			? [{ kind: "text" as const, text }]
			: []),
		...suggestShopTokens(word, {
			active: [...chips.map(({ token }) => token), matchToken],
			catalog,
		}).map((suggestion) => ({ kind: "token" as const, ...suggestion })),
		...suggestShortcuts(word).map((shortcut) => ({
			kind: "shortcut" as const,
			...shortcut,
		})),
		...itemRows.map((item) => ({ kind: "item" as const, item })),
	]
	return { chips, suggestions }
}

type PickContext = {
	chips: readonly TokenSuggestion[]
	query: string
	filters: ShopFilters
	catalog?: ShopCatalog
}

/**
 * The search after the list's value changed (a pick, or a chip removed): the newly picked
 * suggestion, the filters of the tokens left, and the text without the typed word once a
 * token or a shortcut replaced it (a shortcut puts its prefix there). The name search
 * commits the text's tokens and keeps the rest as text.
 */
export function pickSuggestions(
	next: readonly Suggestion[],
	{ chips, query, filters, catalog }: PickContext,
) {
	const chipKeys = new Set(chips.map(suggestionKey))
	const picked = next.find(
		(suggestion) => !chipKeys.has(suggestionKey(suggestion)),
	)
	const tokens = next.flatMap((suggestion) =>
		suggestion.kind === "token" ? [suggestion.token] : [],
	)
	if (picked?.kind === "text") {
		const committed = commitShopQuery(query, { includeLastWord: true, catalog })
		return {
			picked,
			query: committed.text,
			filters: filtersFromTokens([...tokens, ...committed.tokens], filters),
		}
	}
	const isTokenPicked = tokens.some(
		(token) => !chipKeys.has(describeToken(token).key),
	)
	return {
		picked,
		query:
			picked?.kind === "shortcut"
				? `${withoutTypedWord(query)}${picked.text}`
				: isTokenPicked
					? withoutTypedWord(query)
					: query,
		filters: filtersFromTokens(tokens, filters),
	}
}

export function tokenSuggestion(token: ShopToken): TokenSuggestion {
	return { kind: "token", token, ...describeToken(token) }
}

/** A stable identity for a suggestion, to compare and key them. */
export function suggestionKey(suggestion: Suggestion) {
	switch (suggestion.kind) {
		case "text":
			return "text"
		case "item":
			return `item:${suggestion.item.id}`
		case "shortcut":
			return `shortcut:${suggestion.text}`
		case "token":
			return suggestion.key
	}
}

/** The text the combobox reads for a suggestion. */
export function suggestionText(suggestion: Suggestion) {
	switch (suggestion.kind) {
		case "text":
			return suggestion.text
		case "item":
			return suggestion.item.name
		default:
			return suggestion.label
	}
}

/** The kind column of a list row: "Search", "Item", "Stat", "Role", "Match", "Recipe"... */
export function suggestionKindLabel(suggestion: Suggestion) {
	switch (suggestion.kind) {
		case "text":
			return "Search"
		case "item":
			return "Item"
		default:
			return suggestion.kindLabel
	}
}
