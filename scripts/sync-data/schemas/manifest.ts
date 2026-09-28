import { z } from "zod"

const patchSchema = z.string().regex(/^\d+\.\d+\.\d+$/)

/** `public/data/manifest.json`: the patches served under `/data/<patch>/`, newest first. */
export const dataManifestSchema = z.strictObject({
	currentPatch: patchSchema,
	patches: z.array(patchSchema).min(1),
	generatedAt: z.iso.datetime(),
})

export type DataManifest = z.infer<typeof dataManifestSchema>
