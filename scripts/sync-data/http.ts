export class HttpError extends Error {
	constructor(
		readonly url: string,
		readonly status: number,
	) {
		super(`HTTP ${status} for ${url}`);
		this.name = "HttpError";
	}
}

export type FetchWithRetryOptions = {
	fetchFn?: typeof fetch;
	retries?: number;
	baseDelayMs?: number;
	timeoutMs?: number;
};

function isRetryable(error: unknown): boolean {
	if (error instanceof HttpError) {
		return error.status === 429 || error.status >= 500;
	}
	return true;
}

/** Throws HttpError on non-2xx; retries network errors, 429 and 5xx with exponential backoff. */
export async function fetchWithRetry(
	url: string,
	{ fetchFn = fetch, retries = 3, baseDelayMs = 500, timeoutMs = 120_000 }: FetchWithRetryOptions = {},
): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		try {
			const response = await fetchFn(url, { signal: AbortSignal.timeout(timeoutMs) });
			if (!response.ok) {
				throw new HttpError(url, response.status);
			}
			return response;
		} catch (error) {
			if (attempt >= retries || !isRetryable(error)) {
				if (error instanceof HttpError) throw error;
				throw new Error(`${(error as Error).message} (${url})`, { cause: error });
			}
			const delay = baseDelayMs * 2 ** attempt;
			console.warn(`  retry ${attempt + 1}/${retries} for ${url} in ${delay}ms (${(error as Error).message})`);
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}

/** Runs `task` over `items` with at most `concurrency` in flight; rejects on the first failure. */
export async function mapWithConcurrency<T, R>(
	items: readonly T[],
	concurrency: number,
	task: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = new Array(items.length);
	// One iterator shared by all workers, so each item is taken exactly once.
	const queue = items.entries();
	let failed = false;
	const worker = async () => {
		for (const [index, item] of queue) {
			if (failed) return;
			try {
				results[index] = await task(item);
			} catch (error) {
				failed = true;
				throw error;
			}
		}
	};
	await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
	return results;
}
