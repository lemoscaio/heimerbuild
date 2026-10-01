import type { Item } from "@schemas/item"
import { type FilterShortcut, suggestShortcuts } from "./filter-shortcuts"
import type { ShopCatalog } from "./shop-catalog"
import {
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

/** A row of the search's list, or a chip in the input (chips are token suggestions). */
export type Suggestion =
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
 * The chips (the filters as tokens) and the list: tokens for the word being typed that are
 * not applied yet, the filters it starts that need a value (`from:`), then the first items
 * the shop shows once the text has words of an item name.
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
	const suggestions: Suggestion[] = [
		...suggestShopTokens(word, {
			active: [...chips.map(({ token }) => token), matchToken],
			catalog,
		}).map((suggestion) => ({ kind: "token" as const, ...suggestion })),
		...suggestShortcuts(word).map((shortcut) => ({
			kind: "shortcut" as const,
			...shortcut,
		})),
		...(nameSearchText(query) ? items.slice(0, ITEM_SUGGESTIONS) : []).map(
			(item) => ({
				kind: "item" as const,
				item,
			}),
		),
	]
	return { chips, suggestions }
}

type PickContext = {
	chips: readonly TokenSuggestion[]
	query: string
	filters: ShopFilters
}

/**
 * The search after the list's value changed (a pick, or a chip removed): the newly picked
 * suggestion, the filters of the tokens left, and the text without the typed word once a
 * token or a shortcut replaced it (a shortcut puts its prefix there).
 */
export function pickSuggestions(
	next: readonly Suggestion[],
	{ chips, query, filters }: PickContext,
) {
	const chipKeys = new Set(chips.map(suggestionKey))
	const picked = next.find(
		(suggestion) => !chipKeys.has(suggestionKey(suggestion)),
	)
	const tokens = next.flatMap((suggestion) =>
		suggestion.kind === "token" ? [suggestion.token] : [],
	)
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
	return suggestion.kind === "item" ? suggestion.item.name : suggestion.label
}

/** The kind column of a list row: "Item", "Stat", "Role", "Match", "Recipe"... */
export function suggestionKindLabel(suggestion: Suggestion) {
	return suggestion.kind === "item" ? "Item" : suggestion.kindLabel
}
