import { useQuery } from "@tanstack/react-query"
import {
	fetchManifest,
	GameDataUnavailableError,
} from "../../services/game-data"

export type PatchQuery<T> = {
	data: T | undefined
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

export type PatchQueryOptions = { enabled?: boolean }

// A missing file will not appear on retry; other failures (network) may.
function retryUnlessUnavailable(failureCount: number, error: unknown) {
	return !(error instanceof GameDataUnavailableError) && failureCount < 3
}

/** Resolves the current patch from the manifest, then loads `key` for it. Files are immutable per patch. */
export function usePatchQuery<T>(
	key: readonly string[],
	fetcher: (patch: string) => Promise<T>,
	{ enabled = true }: PatchQueryOptions = {},
): PatchQuery<T> {
	const manifest = useQuery({
		queryKey: ["manifest"],
		queryFn: fetchManifest,
		staleTime: Infinity,
		retry: retryUnlessUnavailable,
	})
	const patch = manifest.data?.currentPatch
	const query = useQuery({
		queryKey: ["gameData", patch, ...key],
		queryFn: () => fetcher(patch as string),
		enabled: enabled && patch !== undefined,
		staleTime: Infinity,
		retry: retryUnlessUnavailable,
	})

	if (manifest.isError) {
		return {
			data: undefined,
			isLoading: false,
			isError: true,
			refetch: manifest.refetch,
		}
	}
	return {
		data: query.data,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	}
}
