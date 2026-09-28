import { z } from "zod"

const patchSchema = z.string().regex(/^\d+\.\d+\.\d+$/)

/** `public/data/manifest.json`: the patches served under `/data/<patch>/`, newest first. */
export const dataManifestSchema = z.strictObject({
	currentPatch: patchSchema,
	patches: z.array(patchSchema).min(1),
	/** Content hash of every patch file, keyed by its path under `/data/` (`16.19.1/items.json`). */
	files: z.record(z.string(), z.string().regex(/^[0-9a-f]{10}$/)),
	generatedAt: z.iso.datetime(),
})

export type DataManifest = z.infer<typeof dataManifestSchema>
