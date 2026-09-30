import type { Item } from "@schemas/item"
import {
	describeToken,
	filtersFromTokens,
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

/** A row of the search's list, or a chip in the input (chips are token suggestions). */
export type Suggestion = TokenSuggestion | { kind: "item"; item: Item }

const ITEM_SUGGESTIONS = 4

type ShopSuggestionsInput = {
	/** The search text; its last word is the one being typed. */
	query: string
	filters: ShopFilters
	/** The items the shop shows; the first ones are suggested once there is text. */
	items: readonly Item[]
}

/**
 * The chips (the filters as tokens) and the list: tokens for the word being typed that are
 * not applied yet, then the first items the shop shows.
 */
export function shopSuggestions({
	query,
	filters,
	items,
}: ShopSuggestionsInput) {
	const chips = tokensFromFilters(filters).map(tokenSuggestion)
	const matchToken: ShopToken = { kind: "match", match: filters.match }
	const suggestions: Suggestion[] = [
		...suggestShopTokens(typedWord(query), {
			active: [...chips.map(({ token }) => token), matchToken],
		}).map((suggestion) => ({ kind: "token" as const, ...suggestion })),
		...(query.trim() ? items.slice(0, ITEM_SUGGESTIONS) : []).map((item) => ({
			kind: "item" as const,
			item,
		})),
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
 * token replaced it.
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
		query: isTokenPicked ? withoutTypedWord(query) : query,
		filters: filtersFromTokens(tokens, filters),
	}
}

export function tokenSuggestion(token: ShopToken): TokenSuggestion {
	return { kind: "token", token, ...describeToken(token) }
}

/** A stable identity for a suggestion, to compare and key them. */
export function suggestionKey(suggestion: Suggestion) {
	return suggestion.kind === "item"
		? `item:${suggestion.item.id}`
		: suggestion.key
}

/** The text the combobox reads for a suggestion. */
export function suggestionText(suggestion: Suggestion) {
	return suggestion.kind === "item" ? suggestion.item.name : suggestion.label
}

/** The kind column of a list row: "Item", "Stat", "Role" or "Match". */
export function suggestionKindLabel(suggestion: Suggestion) {
	return suggestion.kind === "item" ? "Item" : suggestion.kindLabel
}
