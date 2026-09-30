/** Sets `--tree` to the tree's accent (theme tokens in app.css); children use `border-(--tree)`, `text-(--tree)`. */
const TREE_ACCENTS: Record<string, string> = {
	Precision: "[--tree:var(--color-precision)]",
	Domination: "[--tree:var(--color-domination)]",
	Sorcery: "[--tree:var(--color-sorcery)]",
	Resolve: "[--tree:var(--color-resolve)]",
	Inspiration: "[--tree:var(--color-inspiration)]",
}

const DEFAULT_ACCENT = "[--tree:var(--color-lilac)]"

/** Stat shards use the gold of their section, like the game client. */
export const SHARD_ACCENT = "[--tree:var(--color-gold)]"

export function treeAccentClass(treeKey: string | undefined) {
	return (treeKey && TREE_ACCENTS[treeKey]) || DEFAULT_ACCENT
}
