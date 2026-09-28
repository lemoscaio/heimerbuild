import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { z } from "zod"
import {
	type Champion,
	type ChampionSummary,
	championIndexSchema,
	championSchema,
} from "./schemas/champion"

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn"
// Lillia has the longest melee range (325), Urgot the shortest ranged one (350).
const MAX_MELEE_RANGE = 325

const ddragonSummarySchema = z.object({
	id: z.string(),
	key: z.string().regex(/^\d+$/),
	name: z.string(),
	title: z.string(),
	tags: z.array(z.string()),
	image: z.object({ full: z.string() }),
})

const ddragonListSchema = z.object({
	data: z.record(z.string(), ddragonSummarySchema),
})

const ddragonStatsSchema = z.object({
	hp: z.number(),
	hpperlevel: z.number(),
	mp: z.number(),
	mpperlevel: z.number(),
	movespeed: z.number(),
	armor: z.number(),
	armorperlevel: z.number(),
	spellblock: z.number(),
	spellblockperlevel: z.number(),
	attackrange: z.number(),
	hpregen: z.number(),
	hpregenperlevel: z.number(),
	mpregen: z.number(),
	mpregenperlevel: z.number(),
	crit: z.number(),
	critperlevel: z.number(),
	attackdamage: z.number(),
	attackdamageperlevel: z.number(),
	attackspeedperlevel: z.number(),
	attackspeed: z.number(),
})

const ddragonDetailSchema = z.object({
	data: z.record(
		z.string(),
		ddragonSummarySchema.extend({
			lore: z.string(),
			partype: z.string(),
			stats: ddragonStatsSchema,
		}),
	),
})

const modifiableFloat = z.object({ baseValue: z.number() }).optional()

// Game files omit fields left at their default value, so every stat is optional.
const characterRecordSchema = z.object({
	__type: z.literal("CharacterRecord"),
	damagePerLevelModifiable: modifiableFloat,
	attackSpeedRatioModifiable: modifiableFloat,
	purchaseIdentities: z.array(z.string()).optional(),
})

type CharacterRecord = z.infer<typeof characterRecordSchema>

function round(value: number): number {
	// CommunityDragon stores float32 values (0.6579999923706055).
	return Math.round(value * 10_000) / 10_000
}

function iconUrl(version: string, image: string): string {
	return `${DDRAGON_CDN}/${version}/img/champion/${image}`
}

function toResource(partype: string): string {
	return partype.trim().toUpperCase().replace(/\s+/g, "_") || "NONE"
}

function findRootRecord(characterBin: unknown): CharacterRecord {
	if (!characterBin || typeof characterBin !== "object") {
		throw new Error("character bin is not an object")
	}
	const roots = Object.entries(characterBin).filter(([path]) =>
		path.endsWith("/CharacterRecords/Root"),
	)
	if (roots.length !== 1) {
		throw new Error(`expected 1 CharacterRecords/Root, found ${roots.length}`)
	}
	return characterRecordSchema.parse(roots[0]?.[1])
}

function attackType(
	record: CharacterRecord,
	attackRange: number,
): Champion["attackType"] {
	const identities = record.purchaseIdentities ?? []
	// Form-swappers (Jayce, Gnar, Kayle, Elise, Nidalee) list both; use the starting range.
	if (identities.length === 1 && identities[0] === "Melee") return "melee"
	if (identities.length === 1 && identities[0] === "Ranged") return "ranged"
	return attackRange > MAX_MELEE_RANGE ? "ranged" : "melee"
}

/** Builds the home-grid index from Data Dragon `champion.json`, sorted by name. */
export function buildChampionIndex(
	championList: unknown,
	version: string,
): ChampionSummary[] {
	const { data } = ddragonListSchema.parse(championList)
	const index = Object.values(data)
		.map((champion) => ({
			key: champion.id,
			id: Number(champion.key),
			name: champion.name,
			title: champion.title,
			roles: champion.tags.map((tag) => tag.toUpperCase()),
			icon: iconUrl(version, champion.image.full),
		}))
		.sort((a, b) => a.name.localeCompare(b.name, "en"))
	return championIndexSchema.parse(index)
}

/** Merges Data Dragon `champion/<Id>.json` with the CommunityDragon character bin. */
export function normalizeChampion(
	detail: unknown,
	characterBin: unknown,
	version: string,
): Champion {
	const champions = Object.values(ddragonDetailSchema.parse(detail).data)
	const [champion] = champions
	if (!champion || champions.length !== 1) {
		throw new Error(`expected 1 champion, found ${champions.length}`)
	}
	const record = findRootRecord(characterBin)
	const stats = champion.stats

	return championSchema.parse({
		key: champion.id,
		id: Number(champion.key),
		name: champion.name,
		title: champion.title,
		roles: champion.tags.map((tag) => tag.toUpperCase()),
		icon: iconUrl(version, champion.image.full),
		lore: champion.lore,
		attackType: attackType(record, stats.attackrange),
		resource: toResource(champion.partype),
		stats: {
			health: { base: stats.hp, perLevel: stats.hpperlevel },
			healthRegen: { base: stats.hpregen, perLevel: stats.hpregenperlevel },
			mana: { base: stats.mp, perLevel: stats.mpperlevel },
			manaRegen: { base: stats.mpregen, perLevel: stats.mpregenperlevel },
			armor: { base: stats.armor, perLevel: stats.armorperlevel },
			magicResistance: {
				base: stats.spellblock,
				perLevel: stats.spellblockperlevel,
			},
			attackDamage: {
				base: stats.attackdamage,
				perLevel: round(
					record.damagePerLevelModifiable?.baseValue ??
						stats.attackdamageperlevel,
				),
			},
			attackSpeed: {
				base: stats.attackspeed,
				perLevelPercent: stats.attackspeedperlevel,
				ratio: round(
					record.attackSpeedRatioModifiable?.baseValue ?? stats.attackspeed,
				),
			},
			criticalStrike: { base: stats.crit, perLevel: stats.critperlevel },
			movespeed: { base: stats.movespeed, perLevel: 0 },
			attackRange: { base: stats.attackrange, perLevel: 0 },
		},
	})
}

export type ChampionOutputSummary = {
	champions: number
	indexBytes: number
	totalBytes: number
}

async function readJson(path: string): Promise<unknown> {
	return JSON.parse(await readFile(path, "utf8"))
}

/**
 * Normalizes every cached champion, then writes `champions.json` and `champions/<key>.json`
 * into `outDir`. Nothing is written unless every champion validates.
 */
export async function writeChampions(
	cacheDir: string,
	outDir: string,
	version: string,
): Promise<ChampionOutputSummary> {
	const index = buildChampionIndex(
		await readJson(join(cacheDir, "ddragon/champion.json")),
		version,
	)
	const champions = await Promise.all(
		index.map(async ({ key }) => {
			try {
				return normalizeChampion(
					await readJson(join(cacheDir, `ddragon/champion/${key}.json`)),
					await readJson(join(cacheDir, `cdragon/characters/${key}.bin.json`)),
					version,
				)
			} catch (error) {
				throw new Error(`${key}: ${(error as Error).message}`, {
					cause: error,
				})
			}
		}),
	)

	const championsDir = join(outDir, "champions")
	await rm(championsDir, { recursive: true, force: true })
	await mkdir(championsDir, { recursive: true })

	const indexText = JSON.stringify(index)
	let totalBytes = Buffer.byteLength(indexText)
	await writeFile(join(outDir, "champions.json"), indexText)
	for (const champion of champions) {
		const text = JSON.stringify(champion)
		totalBytes += Buffer.byteLength(text)
		await writeFile(join(championsDir, `${champion.key}.json`), text)
	}
	return {
		champions: champions.length,
		indexBytes: Buffer.byteLength(indexText),
		totalBytes,
	}
}
