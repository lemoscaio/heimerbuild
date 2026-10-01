import { writeFile } from "node:fs/promises"
import { join } from "node:path"
import * as z from "zod/mini"
import { itemMarkupToText } from "./item-text"
import { readJson } from "./read-json"
import { runeMarkupToRichText } from "./rune-text"
import {
	type Rune,
	type RunesFile,
	type RuneTree,
	runesFileSchema,
	type Shard,
	type ShardRow,
	type ShardStat,
} from "./schemas/rune"

const ddragonRuneSchema = z.object({
	id: z.number(),
	key: z.string(),
	icon: z.string(),
	name: z.string(),
	shortDesc: z.string(),
	longDesc: z.string(),
})

const runesReforgedSchema = z.array(
	z.object({
		id: z.number(),
		key: z.string(),
		icon: z.string(),
		name: z.string(),
		slots: z.array(z.object({ runes: z.array(ddragonRuneSchema) })),
	}),
)

const perksSchema = z.array(
	z.object({
		id: z.number(),
		name: z.string(),
		shortDesc: z.string(),
		iconPath: z.string(),
	}),
)

const perkStylesSchema = z.object({
	styles: z.array(
		z.object({
			name: z.string(),
			slots: z.array(
				z.object({
					type: z.string(),
					slotLabel: z.string(),
					perks: z.array(z.number()),
				}),
			),
		}),
	),
})

/** In-game order of the tree picker; a tree missing here goes last. */
const TREE_ORDER = [
	"Precision",
	"Domination",
	"Sorcery",
	"Resolve",
	"Inspiration",
]

const STAT_MOD_SLOT = "kStatMod"
const CDRAGON_ASSET_PREFIX = "/lol-game-data/assets/v1/"

type ShardStatRule = {
	/** Matches the plain-text description; group 1 is the level 1 value, group 2 the level 18 one. */
	pattern: RegExp
	stats: readonly ShardStat["stat"][]
	unit: "flat" | "percent"
}

const NUMBER = String.raw`(\d+(?:\.\d+)?)`

function rule(
	pattern: string,
	stats: ShardStatRule["stats"],
	unit: ShardStatRule["unit"],
): ShardStatRule {
	return { pattern: new RegExp(`^\\+${pattern}$`), stats, unit }
}

/**
 * The stats behind each shard. The values come from the CommunityDragon description, so a
 * patch that changes a number updates the data; an unknown shard or reworded text fails the sync.
 */
export const SHARD_STAT_RULES: Readonly<Record<number, ShardStatRule>> = {
	5001: rule(
		`${NUMBER}-${NUMBER} Health \\(based on level\\)`,
		["health"],
		"flat",
	),
	5005: rule(`${NUMBER}% Attack Speed`, ["attackSpeedPercent"], "percent"),
	5007: rule(`${NUMBER} Ability Haste`, ["abilityHaste"], "flat"),
	5008: rule(`${NUMBER} Adaptive Force`, ["adaptiveForce"], "flat"),
	5010: rule(`${NUMBER}% Move Speed`, ["movementSpeedPercent"], "percent"),
	5011: rule(`${NUMBER} Health`, ["health"], "flat"),
	5013: rule(
		`${NUMBER}% Tenacity and Slow Resist`,
		["tenacityPercent", "slowResistPercent"],
		"percent",
	),
}

type PlaceholderValue = {
	value: string
	/** Where the number comes from. */
	source: string
}

/**
 * Numbers for the `@name@` placeholders Data Dragon leaves unresolved in long descriptions,
 * by rune key. A placeholder missing here fails the sync, so the app never shows `@f3@`.
 */
export const RUNE_PLACEHOLDER_VALUES: Readonly<
	Record<string, Readonly<Record<string, PlaceholderValue>>>
> = {
	AbsorbLife: {
		HealAmount: {
			value: "1 - 23 health (based on level)",
			source: "CommunityDragon perks.json 16.19, Absorb Life longDesc",
		},
	},
	FontOfLife: {
		BaseHeal: {
			value: "10 - 54.71",
			source: "https://wiki.leagueoflegends.com/en-us/Font_of_Life",
		},
	},
	UnsealedSpellbook: {
		f3: {
			value: "270",
			source: "https://wiki.leagueoflegends.com/en-us/Unsealed_Spellbook",
		},
	},
}

export function fillPlaceholders(runeKey: string, markup: string): string {
	return markup.replace(/@(\w+)@/g, (placeholder, name: string) => {
		const filled = RUNE_PLACEHOLDER_VALUES[runeKey]?.[name]
		if (!filled) {
			throw new Error(
				`rune ${runeKey}: unresolved ${placeholder} in its long description; add it to RUNE_PLACEHOLDER_VALUES`,
			)
		}
		return filled.value
	})
}

function round(value: number): number {
	return Math.round(value * 10_000) / 10_000
}

function toRune(rune: z.infer<typeof ddragonRuneSchema>): Rune {
	return {
		id: rune.id,
		key: rune.key,
		name: rune.name,
		icon: rune.icon,
		description: itemMarkupToText(rune.shortDesc),
		longDescription: runeMarkupToRichText(
			fillPlaceholders(rune.key, rune.longDesc),
		),
	}
}

function shardIcon(iconPath: string): string {
	if (!iconPath.startsWith(CDRAGON_ASSET_PREFIX)) {
		throw new Error(`unexpected shard icon path ${iconPath}`)
	}
	return iconPath.slice(CDRAGON_ASSET_PREFIX.length)
}

export function parseShardStats(id: number, description: string): ShardStat[] {
	const shardRule = SHARD_STAT_RULES[id]
	if (!shardRule) throw new Error(`shard ${id} has no SHARD_STAT_RULES entry`)
	const match = description.match(shardRule.pattern)
	if (!match?.[1]) {
		throw new Error(`shard ${id}: description "${description}" does not match`)
	}
	const scale = shardRule.unit === "percent" ? 0.01 : 1
	const min = round(Number(match[1]) * scale)
	const max = round(Number(match[2] ?? match[1]) * scale)
	return shardRule.stats.map((stat) => ({ stat, min, max }))
}

/** The stat shard rows, which every tree shares; fails if a tree ever lists different ones. */
function readShardRows(perkStyles: unknown): ShardRow[] {
	const { styles } = perkStylesSchema.parse(perkStyles)
	const rowsPerStyle = styles.map((style) =>
		style.slots
			.filter((slot) => slot.type === STAT_MOD_SLOT)
			.map((slot) => ({ label: slot.slotLabel, shardIds: slot.perks })),
	)
	const [rows] = rowsPerStyle
	if (!rows) throw new Error("perkstyles.json has no styles")
	for (const [index, other] of rowsPerStyle.entries()) {
		if (JSON.stringify(other) !== JSON.stringify(rows)) {
			throw new Error(
				`${styles[index]?.name} has different stat shard rows than ${styles[0]?.name}`,
			)
		}
	}
	return rows
}

function treeOrder(name: string): number {
	const index = TREE_ORDER.indexOf(name)
	return index === -1 ? TREE_ORDER.length : index
}

/** Merges Data Dragon trees with the CommunityDragon stat shards into `runes.json`. */
export function normalizeRunes(
	runesReforged: unknown,
	perks: unknown,
	perkStyles: unknown,
	version: string,
): RunesFile {
	const trees: RuneTree[] = runesReforgedSchema
		.parse(runesReforged)
		.map((tree) => {
			const [keystones, ...rows] = tree.slots.map((slot) =>
				slot.runes.map(toRune),
			)
			return {
				id: tree.id,
				key: tree.key,
				name: tree.name,
				icon: tree.icon,
				keystones: keystones ?? [],
				rows,
			}
		})
		.sort((a, b) => treeOrder(a.name) - treeOrder(b.name))

	const shardRows = readShardRows(perkStyles)
	const perksById = new Map(perksSchema.parse(perks).map((p) => [p.id, p]))
	const shardIds = [...new Set(shardRows.flatMap((row) => row.shardIds))]
	const shards: Shard[] = shardIds.map((id) => {
		const perk = perksById.get(id)
		if (!perk) throw new Error(`shard ${id} is missing from perks.json`)
		const description = itemMarkupToText(perk.shortDesc)
		return {
			id,
			name: perk.name,
			icon: shardIcon(perk.iconPath),
			description,
			stats: parseShardStats(id, description),
		}
	})

	return runesFileSchema.parse({ version, trees, shards, shardRows })
}

export type RunesOutputSummary = {
	trees: number
	runes: number
	shards: number
	bytes: number
}

/** Normalizes the cached rune data and writes `runes.json` into `outDir`. */
export async function writeRunes(
	cacheDir: string,
	outDir: string,
	version: string,
): Promise<RunesOutputSummary> {
	const file = normalizeRunes(
		await readJson(join(cacheDir, "ddragon/runesReforged.json")),
		await readJson(join(cacheDir, "cdragon/perks.json")),
		await readJson(join(cacheDir, "cdragon/perkstyles.json")),
		version,
	)
	const text = JSON.stringify(file)
	await writeFile(join(outDir, "runes.json"), text)
	return {
		trees: file.trees.length,
		runes: file.trees.reduce(
			(sum, tree) => sum + tree.keystones.length + tree.rows.flat().length,
			0,
		),
		shards: file.shards.length,
		bytes: Buffer.byteLength(text),
	}
}
