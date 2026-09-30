import { compareVersions } from "../version"

/** A game patch as "major.minor" ("16.19"); Data Dragon versions add a third number. */
export type Patch = `${number}.${number}`

/** Inclusive on both ends; no `until` means every later patch too. */
export type PatchRange = { since: Patch; until?: Patch }

const PATCH_PATTERN = /^\d+\.\d+$/

export function assertValidPatchRange({ since, until }: PatchRange): void {
	for (const patch of [since, until]) {
		if (patch !== undefined && !PATCH_PATTERN.test(patch)) {
			throw new Error(`Invalid patch "${patch}", expected "<major>.<minor>"`)
		}
	}
	if (until !== undefined && compareVersions(since, until) > 0) {
		throw new Error(`Patch range ${since}..${until} ends before it starts`)
	}
}

/** Matches on major.minor only: "16.19.1" is in `{ since: "16.19" }`. */
export function isInPatchRange(version: string, range: PatchRange): boolean {
	const patch = version.split(".").slice(0, 2).join(".")
	return (
		compareVersions(patch, range.since) >= 0 &&
		(range.until === undefined || compareVersions(patch, range.until) <= 0)
	)
}

export function patchRangesOverlap(a: PatchRange, b: PatchRange): boolean {
	const startsBeforeEnd = (start: Patch, end: Patch | undefined) =>
		end === undefined || compareVersions(start, end) <= 0
	return startsBeforeEnd(a.since, b.until) && startsBeforeEnd(b.since, a.until)
}
