import type { ChampionRole } from "@schemas/champion"
import { type Item, STAT_UNITS, type StatKey } from "@schemas/item"
import type { ShopSearchToken } from "@/lib/analytics/analytics-events"
import { normalizeSearchText } from "@/lib/normalize-search-text"
import type { RoleFilter } from "./filter-items-by-role"
import type { StatMatch } from "./filter-items-by-stats"
import { rolesInfo } from "./roles-info"
import type { ShopCatalog } from "./shop-catalog"
import { shopStats } from "./shop-stats"

/** Item flags a `has:` token filters by; the names are the item fields. */
export type ItemEffect = keyof Pick<Item, "active" | "antiHeal">

export type ItemRef = Pick<Item, "id" | "name" | "icon">

/** A token that narrows the items on its own; every condition applies at once. */
export type ConditionToken =
	| { kind: "has"; effect: ItemEffect }
	| { kind: "group"; group: string; label: string }
	| { kind: "from" | "into"; item: ItemRef }
	/** `min` as typed: 30 for 30% on a percent stat. */
	| { kind: "statMin"; stat: StatKey; min: number }
	| { kind: "gold"; bound: "min" | "max"; value: number }

/** A filter typed in the shop search. */
export type ShopToken =
	| { kind: "stat"; stat: StatKey }
	| { kind: "role"; role: ChampionRole }
	| { kind: "match"; match: StatMatch }
	| ConditionToken

/** The shop's filter state, which both the icons and the search tokens edit. */
export type ShopFilters = {
	role: RoleFilter
	stats: readonly StatKey[]
	match: StatMatch
	/** The tokens with no icon in the shop, in the order they were added. */
	conditions: readonly ConditionToken[]
}

const itemEffects: readonly {
	effect: ItemEffect
	label: string
	/** The first is shown on the chip. */
	terms: readonly [string, ...string[]]
}[] = [
	{ effect: "active", label: "Has an active", terms: ["has:active", "active"] },
	{
		effect: "antiHeal",
		label: "Anti-heal (Grievous Wounds)",
		terms: ["antiheal", "has:antiheal"],
	},
]

const GOLD_BUCKET = 500

/** Everything the search shows about a token. */
export type TokenDescription = {
	/** A stable identity, to compare and key tokens. */
	key: string
	/** The term shown for it: the first alias of a stat, `role:<role>`, `and` or `or`. */
	term: string
	/** The name of what it filters: "Ability Power", "Mage", "Items with any selected stat". */
	label: string
	/** What kind of filter it is, in the suggestions: "Stat", "Role", "Match", "Recipe"... */
	kindLabel: string
	icon?: string
	/** Its kind and an id for analytics (stat key, role, item or group id), never typed text. */
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
		case "has": {
			const info = itemEffects.find(({ effect }) => effect === token.effect)
			return {
				key: `has:${token.effect}`,
				term: info?.terms[0] ?? "",
				label: info?.label ?? "",
				kindLabel: "Effect",
				value: { kind: "has", value: token.effect },
			}
		}
		case "group":
			return {
				key: `group:${token.group}`,
				term: `group:${normalizeSearchText(token.label)}`,
				label: `${token.label} group`,
				kindLabel: "Group",
				value: { kind: "group", value: token.group },
			}
		case "from":
		case "into":
			return {
				key: `${token.kind}:${token.item.id}`,
				term: `${token.kind}:${normalizeSearchText(token.item.name)}`,
				label: `Builds ${token.kind} ${token.item.name}`,
				kindLabel: "Recipe",
				icon: token.item.icon,
				value: { kind: token.kind, value: token.item.id },
			}
		case "statMin": {
			const info = shopStats.find(({ stat }) => stat === token.stat)
			const unit = STAT_UNITS[token.stat] === "percent" ? "%" : ""
			return {
				key: `statMin:${token.stat}`,
				term: `${info?.aliases[0] ?? ""}>=${token.min}`,
				label: `${info?.label ?? ""} at least ${token.min}${unit}`,
				kindLabel: "Stat",
				icon: info?.icon,
				value: { kind: "statMin", value: token.stat },
			}
		}
		case "gold": {
			const isMax = token.bound === "max"
			const bucket = Math.floor(token.value / GOLD_BUCKET) * GOLD_BUCKET
			return {
				key: `gold:${token.bound}`,
				term: `gold${isMax ? "<=" : ">="}${token.value}`,
				label: `Costs ${isMax ? "at most" : "at least"} ${token.value} gold`,
				kindLabel: "Gold",
				value: { kind: "gold", value: `${token.bound}:${bucket}` },
			}
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
	...itemEffects.flatMap(({ effect, terms }) =>
		terms.map((term) => ({ term, token: { kind: "has" as const, effect } })),
	),
	{ term: "and", token: { kind: "match", match: "all" } },
	{ term: "or", token: { kind: "match", match: "any" } },
]

const termsByWord = new Map(tokenTerms.map((term) => [term.term, term]))

const statsByAlias = new Map(
	shopStats.flatMap(({ stat, aliases }) =>
		aliases.map((alias) => [alias, stat] as const),
	),
)

/** `ap>=80`, `gold<=1500`: a stat alias or `gold`, a comparison and a number. */
const COMPARISON = /^(.+?)(>=|<=)(\d+(?:\.\d+)?)$/

/** Case- and accent-insensitive form of a typed word; `:` and `%` stay, they are part of terms. */
export function normalizeTerm(word: string) {
	return word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
}

type CatalogOptions = {
	/** The item names and the terms built from the items (`group:`, `from:`, `into:`). */
	catalog?: ShopCatalog
}

export function findToken(
	word: string,
	{ catalog }: CatalogOptions = {},
): ShopToken | undefined {
	const typed = normalizeTerm(word)
	return (
		termsByWord.get(typed)?.token ??
		comparisonToken(typed) ??
		catalogToken(typed, catalog)
	)
}

/** `ap>=80` or `gold<=1500`; stats only take `>=`. */
function comparisonToken(typed: string): ShopToken | undefined {
	const match = COMPARISON.exec(typed)
	if (!match) return undefined
	const [, subject, comparison, number] = match
	const value = Number(number)
	if (subject === "gold") {
		return { kind: "gold", bound: comparison === "<=" ? "max" : "min", value }
	}
	const stat = statsByAlias.get(subject)
	return stat && comparison === ">="
		? { kind: "statMin", stat, min: value }
		: undefined
}

/** A catalog term, or the only one that starts with the typed word (`into:rabadon`). */
function catalogToken(typed: string, catalog: ShopCatalog | undefined) {
	const terms = catalog?.terms ?? []
	const exact = terms.find(({ term }) => term === typed)
	if (exact) return exact.token
	if (!/^[a-z]+:./.test(typed)) return undefined
	const started = terms.filter(({ term }) => term.startsWith(typed))
	return started.length === 1 ? started[0].token : undefined
}

/** Splits a query into tokens and the free text left for the item name search. */
export function parseShopQuery(text: string, { catalog }: CatalogOptions = {}) {
	const itemNames = catalog?.itemNames ?? []
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
		const token = findToken(word, { catalog })
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
} & CatalogOptions

/**
 * Commits the finished words of the search input: tokens come out, other words stay as text.
 * The word still being typed stays as it is, so typing "ap" never turns into a token early.
 */
export function commitShopQuery(
	text: string,
	{ includeLastWord = false, catalog }: CommitOptions = {},
) {
	const closed = includeLastWord || /\s$/.test(text)
	const all = words(text)
	const typing = closed ? undefined : all.pop()
	const { tokens, freeText } = parseShopQuery(all.join(" "), { catalog })
	const rest = [freeText, typing].filter(Boolean).join(" ")
	return {
		tokens,
		text: closed && !includeLastWord && freeText ? `${rest} ` : rest,
	}
}

/** Tokens as analytics values: stat keys, role, item and group ids and the match mode, never labels. */
export function searchTokensForAnalytics(filters: ShopFilters) {
	const tokens: ShopSearchToken[] = tokensFromFilters(filters).map(
		(token) => describeToken(token).value,
	)
	return filters.stats.length
		? [...tokens, { kind: "match" as const, value: filters.match }]
		: tokens
}

/** The words of a query that can be part of an item name: not `from:she` or `ap>=8` being typed. */
export function nameSearchText(query: string) {
	return words(query)
		.filter((word) => !TOKEN_SYNTAX.test(word))
		.join(" ")
}

const TOKEN_SYNTAX = /[:<>=]/

/** The word being typed at the end of the query, or "" right after a space. */
export function typedWord(query: string) {
	return /\S+$/.exec(query)?.[0] ?? ""
}

/** The query without the word being typed, once a suggestion has replaced it. */
export function withoutTypedWord(query: string) {
	return query.replace(/\S+$/, "")
}

/** The tokens that show the filters in the search: the role, the stats in selection order, then the conditions. */
export function tokensFromFilters({
	role,
	stats,
	conditions,
}: ShopFilters): ShopToken[] {
	return [
		...(role === "ALL" ? [] : [{ kind: "role" as const, role }]),
		...stats.map(statToken),
		...conditions,
	]
}

/**
 * The filters after applying tokens in order: stats and conditions add up, the last role and
 * match win, and a condition replaces the one with the same key (`ap>=80` then `ap>=100`).
 */
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
	return applyShopTokens(
		{ role: "ALL", stats: [], match, conditions: [] },
		tokens,
	)
}

type SuggestOptions = {
	/** Tokens already applied; they are not suggested again. */
	active?: readonly ShopToken[]
	/** Rows for a plain word; a typed prefix (`group:`, `from:`) lists up to `PREFIX_LIMIT`. */
	limit?: number
} & CatalogOptions

/** After `group:` or `from:` the list is a browsable menu of every value. */
const PREFIX_LIMIT = 15

/**
 * Tokens for the word being typed, one entry per token: a complete comparison (`ap>=80`),
 * then the terms (or stat names) it starts. Item terms only show once their prefix is typed
 * (`from:`), and match the start of any word of the name (`into:deathcap`).
 */
export function suggestShopTokens(
	word: string,
	{ active = [], limit = 5, catalog }: SuggestOptions = {},
) {
	const typed = normalizeTerm(word.trim())
	if (!typed) return []
	const activeDescriptions = active.map(describeToken)
	const seen = new Set(activeDescriptions.map(({ key }) => key))
	const suggestions: ({ token: ShopToken } & TokenDescription)[] = []
	const compared = comparisonToken(typed)
	if (compared) {
		const description = describeToken(compared)
		if (!activeDescriptions.some(({ term }) => term === description.term)) {
			suggestions.push({ token: compared, ...description })
		}
	}
	const [prefix, value] = splitPrefix(typed)
	const max = prefix ? Math.max(limit, PREFIX_LIMIT) : limit
	const candidates = [
		...tokenTerms.map(({ term, token }) => ({ term, token, words: [] })),
		...(prefix ? (catalog?.terms ?? []) : []),
	]
	for (const { term, token, words } of candidates) {
		if (suggestions.length >= max) break
		const description = describeToken(token)
		const matches =
			term.startsWith(typed) ||
			(token.kind === "stat" &&
				normalizeTerm(description.label).startsWith(typed)) ||
			(!!value &&
				term.startsWith(`${prefix}:`) &&
				words.some((name) => name.startsWith(value)))
		if (!matches || seen.has(description.key)) continue
		seen.add(description.key)
		suggestions.push({ token, ...description })
	}
	return suggestions
}

/** `from:sheen` -> ["from", "sheen"]; a word without a prefix -> [undefined, word]. */
function splitPrefix(typed: string) {
	const match = /^([a-z]+):(.*)$/.exec(typed)
	return match ? [match[1], match[2]] : [undefined, typed]
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
		default: {
			const key = describeToken(token).key
			const index = filters.conditions.findIndex(
				(condition) => describeToken(condition).key === key,
			)
			return {
				...filters,
				conditions:
					index === -1
						? [...filters.conditions, token]
						: filters.conditions.with(index, token),
			}
		}
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
