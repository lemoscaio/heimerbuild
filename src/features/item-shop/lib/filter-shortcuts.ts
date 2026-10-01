import { normalizeTerm } from "./shop-query"
import { shopStats } from "./shop-stats"

/** A filter that needs a value: picking it puts its prefix in the search, to complete. */
export type FilterShortcut = {
	/** The prefix it puts in the search. */
	text: string
	label: string
	/** What kind of filter it is, as on its tokens. */
	kindLabel: string
	/** A complete token, to show how it is typed. */
	example: string
}

/** The filters with a fixed prefix that need a value. */
export const filterShortcuts: readonly FilterShortcut[] = [
	{
		text: "group:",
		label: "Unique group",
		kindLabel: "Group",
		example: "group:lifeline",
	},
	{
		text: "from:",
		label: "Builds from an item",
		kindLabel: "Recipe",
		example: "from:sheen",
	},
	{
		text: "into:",
		label: "Builds into an item",
		kindLabel: "Recipe",
		example: "into:rabadon",
	},
	{
		text: "gold<=",
		label: "Costs at most",
		kindLabel: "Gold",
		example: "gold<=1500",
	},
	{
		text: "gold>=",
		label: "Costs at least",
		kindLabel: "Gold",
		example: "gold>=3000",
	},
]

/** The `<stat>>=` shortcut, such as `ap>=` for "Ability Power at least". */
export function statMinShortcut(alias: string): FilterShortcut | undefined {
	const info = shopStats.find(({ aliases }) => aliases.includes(alias))
	return (
		info && {
			text: `${alias}>=`,
			label: `${info.label} at least`,
			kindLabel: "Stat",
			example: `${alias}>=${info.stat.endsWith("Percent") ? 20 : 50}`,
		}
	)
}

/** The shortcuts the word being typed starts, and `ap>=` once a stat alias is typed (`ap`, `ap>`). */
export function suggestShortcuts(word: string): FilterShortcut[] {
	const typed = normalizeTerm(word.trim())
	if (!typed) return []
	const statShortcut = statMinShortcut(typed.replace(/>$/, ""))
	return [
		...(statShortcut ? [statShortcut] : []),
		...filterShortcuts.filter(
			({ text }) => text.startsWith(typed) && text !== typed,
		),
	]
}
