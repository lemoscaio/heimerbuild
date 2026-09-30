import type { ChampionRole } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { ShopSearchToken } from "@/lib/analytics/analytics-events"
import { normalizeSearchText } from "@/lib/normalize-search-text"
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

/** Everything the search shows about a token. */
export type TokenDescription = {
	/** A stable identity, to compare and key tokens. */
	key: string
	/** The term shown for it: the first alias of a stat, `role:<role>`, `and` or `or`. */
	term: string
	/** The name of what it filters: "Ability Power", "Mage", "Items with any selected stat". */
	label: string
	/** What kind of filter it is, in the suggestions: "Stat", "Role", "Match". */
	kindLabel: string
	icon?: string
	/** Its kind and raw value for analytics (stat key, role id or match mode), never a label. */
	value: ShopSearchToken
}

/** The one place that describes a token. A new token kind adds a case here, its terms below and a case in `applyToken`. */
export function describeToken(token: ShopToken): TokenDescription {
	switch (token.kind) {
		case "stat": {
			const info = shopStats.find(({ stat }) => stat === token.stat)
			return {
				key: `stat:${token.stat}`,
				term: info?.aliases[0] ?? "",
				label: info?.label ?? "",
				kindLabel: "Stat",
				icon: info?.icon,
				value: { kind: "stat", value: token.stat },
			}
		}
		case "role": {
			const info = rolesInfo.find(({ role }) => role === token.role)
			return {
				key: `role:${token.role}`,
				term: `role:${token.role.toLowerCase()}`,
				label: info?.label ?? "",
				kindLabel: "Role",
				icon: info?.icon,
				value: { kind: "role", value: token.role },
			}
		}
		case "match":
			return {
				key: `match:${token.match}`,
				term: token.match === "all" ? "and" : "or",
				label:
					token.match === "all"
						? "Items with every selected stat"
						: "Items with any selected stat",
				kindLabel: "Match",
				value: { kind: "match", value: token.match },
			}
	}
}

/** Every word that types a token, in suggestion order. */
const tokenTerms: readonly { term: string; token: ShopToken }[] = [
	...shopStats.flatMap(({ stat, aliases }) =>
		aliases.map((term) => ({ term, token: statToken(stat) })),
	),
	...rolesInfo.flatMap(({ role }) =>
		role === "ALL"
			? []
			: [`role:${role.toLowerCase()}`, role.toLowerCase()].map((term) => ({
					term,
					token: { kind: "role" as const, role },
				})),
	),
	{ term: "and", token: { kind: "match", match: "all" } },
	{ term: "or", token: { kind: "match", match: "any" } },
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
	// Split the names only once a word could be a token.
	let nameWords: string[][] | undefined
	function startsItemName(phrase: string) {
		nameWords ??= itemNames.map(searchWords)
		const phraseWords = searchWords(phrase)
		return nameWords.some((name) => startsWith(name, phraseWords))
	}
	for (const word of words(text)) {
		const token = findToken(word)
		if (token && !startsItemName([...freeWords, word].join(" "))) {
			tokens.push(token)
		} else {
			freeWords.push(word)
		}
	}
	return { tokens, freeText: freeWords.join(" ") }
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
	const tokens: ShopSearchToken[] = tokensFromFilters(filters).map(
		(token) => describeToken(token).value,
	)
	return filters.stats.length
		? [...tokens, { kind: "match" as const, value: filters.match }]
		: tokens
}

/** The word being typed at the end of the query, or "" right after a space. */
export function typedWord(query: string) {
	return /\S+$/.exec(query)?.[0] ?? ""
}

/** The query without the word being typed, once a suggestion has replaced it. */
export function withoutTypedWord(query: string) {
	return query.replace(/\S+$/, "")
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
	const seen = new Set(active.map((token) => describeToken(token).key))
	const suggestions: ({ token: ShopToken } & TokenDescription)[] = []
	for (const { term, token } of tokenTerms) {
		const description = describeToken(token)
		const matches =
			term.startsWith(typed) ||
			(token.kind === "stat" &&
				normalizeTerm(description.label).startsWith(typed))
		if (!matches || seen.has(description.key)) continue
		seen.add(description.key)
		suggestions.push({ token, ...description })
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
