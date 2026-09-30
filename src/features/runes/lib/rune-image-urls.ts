import type { RunesFile } from "@schemas/rune"

/** Every tree, rune and shard icon of the patch, each once. */
export function runeImageUrls(runes: RunesFile): Set<string> {
	return new Set([
		...runes.trees.flatMap((tree) => [
			tree.icon,
			...tree.keystones.map((rune) => rune.icon),
			...tree.rows.flat().map((rune) => rune.icon),
		]),
		...runes.shards.map((shard) => shard.icon),
	])
}
