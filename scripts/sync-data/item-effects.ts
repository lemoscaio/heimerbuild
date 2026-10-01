import { z } from "zod"

/** Grievous Wounds: Data Dragon marks it as `<keyword>40% Wounds</keyword>` in the description. */
export function appliesWounds(description: string) {
	return /<keyword>[^<]*\bWounds<\/keyword>/i.test(description)
}

const DataValuesSchema = z
	.array(z.object({ mName: z.string() }).loose())
	.optional()

/** CommunityDragon names an item's anti-heal values `GrievousAmount`, `GrievousDuration`. */
export function hasGrievousValues(entry: Record<string, unknown>) {
	const values = DataValuesSchema.parse(entry.mDataValues) ?? []
	return values.some(({ mName }) => /grievous/i.test(mName))
}

export type AntiHealMismatch = { id: string; name: string; keyword: boolean }

export function formatAntiHealMismatches(
	mismatches: readonly AntiHealMismatch[],
) {
	return [
		"Anti-heal differs between the description and CommunityDragon:",
		...mismatches.map(
			({ id, name, keyword }) =>
				`  ${id} ${name}: ${keyword ? "Wounds keyword without Grievous data values" : "Grievous data values without a Wounds keyword"}`,
		),
		"Check the item, then fix the detection in scripts/sync-data/item-effects.ts or add an override.",
	].join("\n")
}
