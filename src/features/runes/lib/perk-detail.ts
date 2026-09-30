import type { RichText, Rune, RuneTree, Shard } from "@schemas/rune"
import { SHARD_ACCENT, treeAccentClass } from "./tree-accent"

/** What the details panel shows for the hovered or focused tree, rune or shard. */
export type PerkDetail = {
	name: string
	icon: string
	/** Sets `--tree`, see `treeAccentClass`. */
	accentClass: string
	/** Where it comes from: the tree's name, or "Stat shard". */
	origin: string
	text: RichText
	/** Runes only: their effects depend on the game, so the stats never add them. */
	isConditional: boolean
}

export function runeDetail(rune: Rune, tree: RuneTree): PerkDetail {
	return {
		name: rune.name,
		icon: rune.icon,
		accentClass: treeAccentClass(tree.key),
		origin: tree.name,
		text: rune.longDescription,
		isConditional: true,
	}
}

export function shardDetail(shard: Shard): PerkDetail {
	return {
		name: shard.name,
		icon: shard.icon,
		accentClass: SHARD_ACCENT,
		origin: "Stat shard",
		text: [[[{ text: shard.description }]]],
		isConditional: false,
	}
}

export function treeDetail(tree: RuneTree): PerkDetail {
	return {
		name: tree.name,
		icon: tree.icon,
		accentClass: treeAccentClass(tree.key),
		origin: "Rune tree",
		text: [],
		isConditional: false,
	}
}
