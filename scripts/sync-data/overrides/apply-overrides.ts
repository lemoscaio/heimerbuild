import { isDeepStrictEqual } from "node:util"
import {
	assertValidPatchRange,
	isInPatchRange,
	type PatchRange,
	patchRangesOverlap,
} from "../schemas/patch-range"

export type FieldOverride<Entity, Field extends keyof Entity> = PatchRange & {
	/** Unique, kebab-case: names the override in the sync log and the sync PR. */
	id: string
	/** Id of the entity it fixes: an item id or a champion key. */
	target: string
	field: Field
	/** What is wrong in Riot's data. */
	reason: string
	/** Link to evidence (wiki page, issue). */
	source?: string
	/** Returns the corrected value. Receives a copy, so mutating it is safe. */
	apply: (value: Entity[Field]) => Entity[Field]
}

/** An override of one field of `Entity`; `apply` is typed by the chosen `field`. */
export type DataOverride<Entity, Field extends keyof Entity = keyof Entity> = {
	[F in Field]-?: FieldOverride<Entity, F>
}[Field]

export type OverrideRef = { id: string; entity: string }

export type OverrideReport = {
	applied: OverrideRef[]
	/** `apply` returned an equal value: Riot fixed the data. */
	obsolete: OverrideRef[]
	/** The target is not in the synced data anymore. */
	missingTarget: OverrideRef[]
}

export type ApplyOverridesOptions<Entity> = {
	/** Data Dragon version being synced ("16.19.1"). */
	version: string
	kind: "item" | "champion"
	idOf: (entity: Entity) => string
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Fails on a malformed id or range, a duplicate id, or two overrides of the same field whose ranges overlap. */
export function assertValidOverrides<Entity extends object>(
	overrides: readonly DataOverride<Entity>[],
): void {
	for (const [index, override] of overrides.entries()) {
		if (!ID_PATTERN.test(override.id)) {
			throw new Error(`Override id "${override.id}" is not kebab-case`)
		}
		try {
			assertValidPatchRange(override)
		} catch (error) {
			throw new Error(`Override "${override.id}": ${(error as Error).message}`)
		}
		for (const earlier of overrides.slice(0, index)) {
			if (earlier.id === override.id) {
				throw new Error(`Duplicate override id "${override.id}"`)
			}
			if (
				earlier.target === override.target &&
				earlier.field === override.field &&
				patchRangesOverlap(earlier, override)
			) {
				throw new Error(
					`Overrides "${earlier.id}" and "${override.id}" both change ${String(override.field)} of ${override.target} in overlapping patches`,
				)
			}
		}
	}
}

/** Applies the overrides whose range includes `version`, in list order, and reports each outcome. */
export function applyOverrides<Entity extends object>(
	entities: readonly Entity[],
	overrides: readonly DataOverride<Entity>[],
	{ version, kind, idOf }: ApplyOverridesOptions<Entity>,
): { entities: Entity[]; report: OverrideReport } {
	assertValidOverrides(overrides)
	const byId = new Map(entities.map((entity) => [idOf(entity), entity]))
	const report: OverrideReport = {
		applied: [],
		obsolete: [],
		missingTarget: [],
	}

	for (const override of overrides) {
		if (!isInPatchRange(version, override)) continue
		const ref = { id: override.id, entity: `${kind} ${override.target}` }
		const entity = byId.get(override.target)
		if (entity === undefined) {
			report.missingTarget.push(ref)
			continue
		}
		const { field, apply } = override as FieldOverride<Entity, keyof Entity>
		const value = apply(structuredClone(entity[field]))
		if (isDeepStrictEqual(value, entity[field])) {
			report.obsolete.push(ref)
			continue
		}
		byId.set(override.target, { ...entity, [field]: value })
		report.applied.push(ref)
	}

	return {
		entities: entities.map((entity) => byId.get(idOf(entity)) ?? entity),
		report,
	}
}

/** One Markdown line per override the synced patch no longer needs. */
export function staleOverrideLines(
	reports: readonly OverrideReport[],
): string[] {
	return reports.flatMap(({ obsolete, missingTarget }) => [
		...obsolete.map(
			({ id, entity }) =>
				`\`${id}\` (${entity}): changes nothing, the synced data is already correct`,
		),
		...missingTarget.map(
			({ id, entity }) => `\`${id}\` (${entity}): not in the synced data`,
		),
	])
}
