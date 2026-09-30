import type { ShopSearchToken } from "@/lib/analytics/analytics-events"
import { normalizeSearchText } from "@/lib/normalize-search-text"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"
import type { RoleFilter } from "./filter-items-by-role"
import type { StatMatch } from "./filter-items-by-stats"
import { rolesInfo } from "./roles-info"
import { shopStats } from "./shop-stats"

/** A filter typed in the shop search. */
export type ShopToken =
	| { kind: "stat"; stat: StatKey }
	| { kind: "role"; role: ChampionRole }
	| { kind: "match"; match: StatMatch }

/** The shop's filter state, which both the icons and the search tokens edit. */
export type ShopFilters = {
	role: RoleFilter
	stats: readonly StatKey[]
	match: StatMatch
}

/** A word the search turns into a token, and how the suggestions show it. */
type TokenTerm = {
	term: string
	label: string
	icon?: string
	token: ShopToken
}

/** Every word that types a token. A new token kind adds its terms here and a case in `applyToken`. */
const tokenTerms: readonly TokenTerm[] = [
	...shopStats.flatMap(({ stat, label, icon, aliases }) =>
		aliases.map((term) => ({ term, label, icon, token: statToken(stat) })),
	),
	...rolesInfo.flatMap(({ role, label, icon }) =>
		role === "ALL"
			? []
			: [`role:${role.toLowerCase()}`, role.toLowerCase()].map((term) => ({
					term,
					label,
					icon,
					token: { kind: "role" as const, role },
				})),
	),
	{
		term: "and",
		label: "Items with every selected stat",
		token: { kind: "match", match: "all" },
	},
	{
		term: "or",
		label: "Items with any selected stat",
		token: { kind: "match", match: "any" },
	},
]

const termsByWord = new Map(tokenTerms.map((term) => [term.term, term]))

/** Case- and accent-insensitive form of a typed word; `:` and `%` stay, they are part of terms. */
export function normalizeTerm(word: string) {
	return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

export function findToken(word: string): ShopToken | undefined {
	return termsByWord.get(normalizeTerm(word))?.token
}

type ParseOptions = {
	/** Item names: a word that continues the start of one stays free text ("health potion"). */
	itemNames?: readonly string[]
}

/** Splits a query into tokens and the free text left for the item name search. */
export function parseShopQuery(
	text: string,
	{ itemNames = [] }: ParseOptions = {},
) {
	const tokens: ShopToken[] = []
	const freeWords: string[] = []
	const nameWords = itemNames.map(searchWords)
	for (const word of words(text)) {
		const token = findToken(word)
		const phrase = searchWords([...freeWords, word].join(" "))
		if (token && !nameWords.some((name) => startsWith(name, phrase))) {
			tokens.push(token)
		} else {
			freeWords.push(word)
		}
	}
	return { tokens, freeText: freeWords.join(" ") }
}

export function serializeShopQuery({
	tokens,
	freeText,
}: {
	tokens: readonly ShopToken[]
	freeText: string
}) {
	return [...tokens.map(tokenTerm), freeText.trim()].filter(Boolean).join(" ")
}

type CommitOptions = {
	/** Also commit the word being typed (Enter, Tab), not only the words a space closed. */
	includeLastWord?: boolean
} & ParseOptions

/**
 * Commits the finished words of the search input: tokens come out, other words stay as text.
 * The word still being typed stays as it is, so typing "ap" never turns into a token early.
 */
export function commitShopQuery(
	text: string,
	{ includeLastWord = false, itemNames }: CommitOptions = {},
) {
	const closed = includeLastWord || /\s$/.test(text)
	const all = words(text)
	const typing = closed ? undefined : all.pop()
	const { tokens, freeText } = parseShopQuery(all.join(" "), { itemNames })
	const rest = [freeText, typing].filter(Boolean).join(" ")
	return {
		tokens,
		text: closed && !includeLastWord && freeText ? `${rest} ` : rest,
	}
}

/** Tokens as analytics values: stat keys, role ids and the match mode, never display labels. */
export function searchTokensForAnalytics(filters: ShopFilters) {
	const tokens: ShopSearchToken[] = tokensFromFilters(filters).map(tokenValue)
	return filters.stats.length
		? [...tokens, { kind: "match" as const, value: filters.match }]
		: tokens
}

/** A token's kind and raw value (stat key, role id or match mode). */
export function tokenValue(token: ShopToken): ShopSearchToken {
	switch (token.kind) {
		case "stat":
			return { kind: "stat", value: token.stat }
		case "role":
			return { kind: "role", value: token.role }
		case "match":
			return { kind: "match", value: token.match }
	}
}

/** The term shown for a token: the first alias of a stat, `role:<role>`, `and` or `or`. */
export function tokenTerm(token: ShopToken) {
	switch (token.kind) {
		case "stat":
			return shopStats.find(({ stat }) => stat === token.stat)?.aliases[0] ?? ""
		case "role":
			return `role:${token.role.toLowerCase()}`
		case "match":
			return token.match === "all" ? "and" : "or"
	}
}

/** The name of what a token filters: "Ability Power", "Mage", "Items with any selected stat". */
export function tokenLabel(token: ShopToken) {
	const key = tokenKey(token)
	return tokenTerms.find((term) => tokenKey(term.token) === key)?.label ?? ""
}

/** The word being typed at the end of the query, or "" right after a space. */
export function typedWord(query: string) {
	return /\S+$/.exec(query)?.[0] ?? ""
}

/** The query without the word being typed, once a suggestion has replaced it. */
export function withoutTypedWord(query: string) {
	return query.replace(/\S+$/, "")
}

/** A stable identity for a token, to compare and key them. */
export function tokenKey(token: ShopToken) {
	switch (token.kind) {
		case "stat":
			return `stat:${token.stat}`
		case "role":
			return `role:${token.role}`
		case "match":
			return `match:${token.match}`
	}
}

/** The tokens that show the filters in the search: the role, then the stats in selection order. */
export function tokensFromFilters({ role, stats }: ShopFilters): ShopToken[] {
	return [
		...(role === "ALL" ? [] : [{ kind: "role" as const, role }]),
		...stats.map(statToken),
	]
}

/** The filters after applying tokens in order: stats add up, the last role and match win. */
export function applyShopTokens(
	filters: ShopFilters,
	tokens: readonly ShopToken[],
): ShopFilters {
	return tokens.reduce(applyToken, filters)
}

/** The filters that exactly match a list of tokens, keeping the match mode unless a token sets it. */
export function filtersFromTokens(
	tokens: readonly ShopToken[],
	{ match }: Pick<ShopFilters, "match">,
): ShopFilters {
	return applyShopTokens({ role: "ALL", stats: [], match }, tokens)
}

type SuggestOptions = {
	/** Tokens already applied; they are not suggested again. */
	active?: readonly ShopToken[]
	limit?: number
}

/** Tokens whose term (or stat name) starts with the word being typed, one entry per token. */
export function suggestShopTokens(
	word: string,
	{ active = [], limit = 5 }: SuggestOptions = {},
) {
	const typed = normalizeTerm(word.trim())
	if (!typed) return []
	const seen = new Set(active.map(tokenKey))
	const suggestions: TokenTerm[] = []
	for (const term of tokenTerms) {
		const key = tokenKey(term.token)
		const matches =
			term.term.startsWith(typed) ||
			(term.token.kind === "stat" &&
				normalizeTerm(term.label).startsWith(typed))
		if (!matches || seen.has(key)) continue
		seen.add(key)
		suggestions.push({ ...term, term: tokenTerm(term.token) })
		if (suggestions.length === limit) break
	}
	return suggestions
}

function applyToken(filters: ShopFilters, token: ShopToken): ShopFilters {
	switch (token.kind) {
		case "stat":
			return filters.stats.includes(token.stat)
				? filters
				: { ...filters, stats: [...filters.stats, token.stat] }
		case "role":
			return { ...filters, role: token.role }
		case "match":
			return { ...filters, match: token.match }
	}
}

function statToken(stat: StatKey): ShopToken {
	return { kind: "stat", stat }
}

/** Whole words, so "mana" does not continue "Manamune" but "health" continues "Health Potion". */
function searchWords(text: string) {
	return words(text).map(normalizeSearchText).filter(Boolean)
}

function startsWith(name: readonly string[], phrase: readonly string[]) {
	return (
		phrase.length <= name.length &&
		phrase.every((word, index) => name[index] === word)
	)
}

function words(text: string) {
	return text.split(/\s+/).filter(Boolean)
}
