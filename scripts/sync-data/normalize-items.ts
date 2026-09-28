import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import {
	type Item,
	type ItemStats,
	type ItemsFile,
	ItemsFileSchema,
} from "./schemas/item"
import { isStatField, NON_STAT_FIELDS, STAT_FIELDS } from "./stat-map"

const DataDragonItemSchema = z.object({
	name: z.string(),
	image: z.object({ full: z.string() }),
	gold: z.object({
		base: z.number(),
		total: z.number(),
		sell: z.number(),
		purchasable: z.boolean(),
	}),
	tags: z.array(z.string()),
	maps: z.record(z.string(), z.boolean()),
	from: z.array(z.string()).optional(),
	into: z.array(z.string()).optional(),
	inStore: z.boolean().optional(),
	requiredChampion: z.string().optional(),
})

const DataDragonItemsSchema = z.object({
	version: z.string(),
	data: z.record(z.string(), DataDragonItemSchema),
})

type CommunityDragonItem = Record<string, unknown> & { itemID: number }

/** Removes float32 noise (~7 significant digits): 0.4000000059604645 -> 0.4. */
function roundStat(value: number): number {
	return Number(value.toPrecision(6))
}

function isStatLike(field: string, value: unknown): boolean {
	return typeof value === "number" || /Mod$|Lethality/.test(field)
}

function indexCommunityDragonItems(
	bin: unknown,
): Map<string, CommunityDragonItem> {
	if (!bin || typeof bin !== "object") {
		throw new Error("items.cdtb.bin.json is not an object")
	}
	const items = new Map<string, CommunityDragonItem>()
	for (const entry of Object.values(bin)) {
		if (entry && typeof entry.itemID === "number") {
			items.set(String(entry.itemID), entry)
		}
	}
	return items
}

/** Unmapped fields are reported per field with the item IDs that carry them. */
function extractStats(
	entry: CommunityDragonItem,
	unmapped: Map<string, string[]>,
): ItemStats {
	const stats: ItemStats = {}
	for (const [field, value] of Object.entries(entry)) {
		if (isStatField(field)) {
			if (typeof value !== "number") {
				throw new Error(
					`Item ${entry.itemID}: ${field} is ${typeof value}, expected a number`,
				)
			}
			if (value !== 0) stats[STAT_FIELDS[field]] = roundStat(value)
		} else if (!NON_STAT_FIELDS.has(field) && isStatLike(field, value)) {
			unmapped.set(field, [...(unmapped.get(field) ?? []), `${entry.itemID}`])
		}
	}
	return stats
}

function formatUnmapped(unmapped: Map<string, string[]>): string {
	const lines = [...unmapped].map(
		([field, ids]) =>
			`  ${field} (items ${ids.slice(0, 5).join(", ")}${ids.length > 5 ? ", ..." : ""})`,
	)
	return [
		"Unmapped stat-like CommunityDragon item fields:",
		...lines,
		"Map each one to a canonical stat in STAT_FIELDS or list it in NON_STAT_FIELDS (scripts/sync-data/stat-map.ts).",
	].join("\n")
}

export function normalizeItems(
	dataDragonItems: unknown,
	communityDragonBin: unknown,
): ItemsFile {
	const { version, data } = DataDragonItemsSchema.parse(dataDragonItems)
	const binItems = indexCommunityDragonItems(communityDragonBin)
	const unmapped = new Map<string, string[]>()

	const items = Object.entries(data)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(([id, item]): Item => {
			const entry = binItems.get(id)
			if (!entry) {
				throw new Error(
					`Item ${id} (${item.name}) has no CommunityDragon entry`,
				)
			}
			return {
				id,
				name: item.name,
				icon: item.image.full,
				gold: item.gold,
				tags: item.tags,
				maps: Object.entries(item.maps)
					.filter(([, enabled]) => enabled)
					.map(([map]) => Number(map)),
				from: item.from ?? [],
				into: item.into ?? [],
				inStore: item.inStore ?? true,
				requiredChampion: item.requiredChampion,
				stats: extractStats(entry, unmapped),
			}
		})

	if (unmapped.size > 0) throw new Error(formatUnmapped(unmapped))
	return ItemsFileSchema.parse({ version, items })
}

export type SyncItemsPaths = { cacheDir: string; outDir: string }

/** Reads the raw cache of one version and writes `<outDir>/items.json`. */
export async function syncItems({
	cacheDir,
	outDir,
}: SyncItemsPaths): Promise<{ path: string; count: number; bytes: number }> {
	const readJson = async (path: string): Promise<unknown> =>
		JSON.parse(await readFile(join(cacheDir, path), "utf8"))
	const file = normalizeItems(
		await readJson("ddragon/item.json"),
		await readJson("cdragon/items.cdtb.bin.json"),
	)
	const text = JSON.stringify(file)
	const path = join(outDir, "items.json")
	await mkdir(outDir, { recursive: true })
	await writeFile(path, text)
	return { path, count: file.items.length, bytes: Buffer.byteLength(text) }
}
