import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import * as z from "zod/mini"
import { readJson } from "./read-json"
import { type Champion, championSchema } from "./schemas/champion"
import { type Item, ItemsFileSchema } from "./schemas/item"
import { assertValidVersion } from "./version"

export type PatchData = {
	champions: Champion[]
	items: Item[]
}

type Change = { name: string; field: string; from: unknown; to: unknown }

/** Keeps PR bodies well under GitHub's 65,536 character limit. */
const MAX_ROWS = 150

function flatten(value: unknown, prefix = ""): Map<string, unknown> {
	const fields = new Map<string, unknown>()
	if (value && typeof value === "object" && !Array.isArray(value)) {
		for (const [key, child] of Object.entries(value)) {
			for (const [path, leaf] of flatten(
				child,
				prefix ? `${prefix}.${key}` : key,
			)) {
				fields.set(path, leaf)
			}
		}
	} else {
		fields.set(prefix, Array.isArray(value) ? value.join(", ") : value)
	}
	return fields
}

function compare<T>(
	before: T[],
	after: T[],
	options: {
		id: (entry: T) => string
		label: (entry: T) => string
		fields: (entry: T) => unknown
	},
): { added: string[]; removed: string[]; changes: Change[] } {
	const beforeById = new Map(before.map((entry) => [options.id(entry), entry]))
	const afterIds = new Set(after.map(options.id))
	const added: string[] = []
	const changes: Change[] = []
	for (const entry of after) {
		const previous = beforeById.get(options.id(entry))
		if (!previous) {
			added.push(options.label(entry))
			continue
		}
		const old = flatten(options.fields(previous))
		const now = flatten(options.fields(entry))
		for (const field of new Set([...old.keys(), ...now.keys()])) {
			if (old.get(field) !== now.get(field)) {
				changes.push({
					name: options.label(entry),
					field,
					from: old.get(field),
					to: now.get(field),
				})
			}
		}
	}
	const removed = before
		.filter((entry) => !afterIds.has(options.id(entry)))
		.map(options.label)
	return { added, removed, changes }
}

function cell(value: unknown): string {
	return value === undefined ? "-" : String(value).replaceAll("|", "\\|")
}

function section(
	title: string,
	counts: { before: number; after: number },
	result: ReturnType<typeof compare>,
): string[] {
	const lines = [`### ${title}: ${counts.before} -> ${counts.after}`, ""]
	if (result.added.length > 0) lines.push(`- Added: ${result.added.join(", ")}`)
	if (result.removed.length > 0)
		lines.push(`- Removed: ${result.removed.join(", ")}`)
	if (result.changes.length === 0) {
		lines.push("- No field changes.", "")
		return lines
	}
	lines.push(
		`- Field changes: ${result.changes.length}`,
		"",
		"| Name | Field | Before | After |",
		"| --- | --- | --- | --- |",
		...result.changes
			.slice(0, MAX_ROWS)
			.map(
				(c) =>
					`| ${cell(c.name)} | ${c.field} | ${cell(c.from)} | ${cell(c.to)} |`,
			),
	)
	if (result.changes.length > MAX_ROWS) {
		lines.push(
			"",
			`${result.changes.length - MAX_ROWS} more changes not shown; see the diff.`,
		)
	}
	lines.push("")
	return lines
}

/** Markdown summary of what changed in the game data between two patches. */
export function diffPatches(
	from: { patch: string; data: PatchData },
	to: { patch: string; data: PatchData },
): string {
	const champions = compare(from.data.champions, to.data.champions, {
		id: (champion) => champion.key,
		label: (champion) => champion.name,
		fields: ({ stats, attackType, resource, roles }) => ({
			stats,
			attackType,
			resource,
			roles,
		}),
	})
	const items = compare(from.data.items, to.data.items, {
		id: (item) => item.id,
		label: (item) => `${item.name} (${item.id})`,
		fields: ({ stats, gold, from: components, roles }) => ({
			stats,
			gold: gold.total,
			from: components,
			roles,
		}),
	})
	return [
		`## Game data changes: ${from.patch} -> ${to.patch}`,
		"",
		...section(
			"Champions",
			{ before: from.data.champions.length, after: to.data.champions.length },
			champions,
		),
		...section(
			"Items",
			{ before: from.data.items.length, after: to.data.items.length },
			items,
		),
	].join("\n")
}

export async function readPatch(
	outputRoot: string,
	patch: string,
): Promise<PatchData> {
	const dir = join(outputRoot, patch)
	const index = (await readJson(join(dir, "champions.json"))) as {
		key: string
	}[]
	const champions = await Promise.all(
		index.map(async ({ key }) =>
			championSchema.parse(
				await readJson(join(dir, "champions", `${key}.json`)),
			),
		),
	)
	const { items } = ItemsFileSchema.parse(
		await readJson(join(dir, "items.json")),
	)
	return { champions, items }
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: { from: { type: "string" }, to: { type: "string" } },
	})
	if (!values.from || !values.to) {
		throw new Error(
			"Usage: bun scripts/sync-data/diff-patches.ts --from <x.y.z> --to <x.y.z>",
		)
	}
	assertValidVersion(values.from)
	assertValidVersion(values.to)
	const outputRoot = resolve(import.meta.dir, "../../public/data")
	console.log(
		diffPatches(
			{ patch: values.from, data: await readPatch(outputRoot, values.from) },
			{ patch: values.to, data: await readPatch(outputRoot, values.to) },
		),
	)
}

if (import.meta.main) {
	// zod/mini loads no locale; readable messages for this CLI only.
	z.config(z.locales.en())
	main().catch((error: unknown) => {
		console.error(
			`diff-patches failed: ${error instanceof Error ? error.message : String(error)}`,
		)
		process.exit(1)
	})
}
