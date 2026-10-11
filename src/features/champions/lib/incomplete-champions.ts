export type IncompleteChampion = {
	championKey: string
	/** What isn't modeled yet, read as the subject of "… aren't modeled yet". */
	missing: string
}

/** Champions whose kit is knowingly incomplete (issue 310); adding one is one line. */
export const INCOMPLETE_CHAMPIONS: readonly IncompleteChampion[] = [
	{
		championKey: "Aphelios",
		missing: "His weapons, their Qs and his R's weapon effects",
	},
	{ championKey: "RekSai", missing: "Her burrowed form and its abilities" },
]

export function findIncompleteChampion(
	championKey: string,
): IncompleteChampion | undefined {
	return INCOMPLETE_CHAMPIONS.find(
		(champion) => champion.championKey === championKey,
	)
}
