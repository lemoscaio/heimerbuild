import type { DataManifest } from "@schemas/manifest"

type PatchList = Pick<DataManifest, "currentPatch" | "patches">

/** The patch a link asks for when its data is still served, the current patch otherwise. */
export function resolveBuildPatch(
	{ currentPatch, patches }: PatchList,
	requestedPatch: string | undefined,
) {
	if (requestedPatch === undefined || requestedPatch === currentPatch) {
		return { patch: currentPatch }
	}
	return patches.includes(requestedPatch)
		? { patch: requestedPatch }
		: { patch: currentPatch, unavailablePatch: requestedPatch }
}
