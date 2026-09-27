import { describe, expect, test } from "bun:test";
import { fetchCommunityDragonItems } from "./download";
import { fetchWithRetry, mapWithConcurrency } from "./http";

type Route = { status: number; body?: string };

function routedFetch(routes: Record<string, Route | Route[]>) {
	const calls: string[] = [];
	const fetchFn = (async (input: string | URL | Request) => {
		const url = String(input);
		calls.push(url);
		const route = routes[url];
		const next = Array.isArray(route) ? route.shift() : route;
		if (!next) throw new Error(`unexpected request ${url}`);
		return new Response(next.body ?? "{}", { status: next.status });
	}) as typeof fetch;
	return { fetchFn, calls };
}

const PATCH_URL = "https://raw.communitydragon.org/16.19/game/items.cdtb.bin.json";
const LATEST_URL = "https://raw.communitydragon.org/latest/game/items.cdtb.bin.json";

describe("fetchCommunityDragonItems", () => {
	test("uses the major.minor patch folder", async () => {
		const { fetchFn, calls } = routedFetch({ [PATCH_URL]: { status: 200, body: '{"a":1}' } });
		const result = await fetchCommunityDragonItems("16.19.1", fetchFn);
		expect(result).toMatchObject({ patch: "16.19", fallback: false, url: PATCH_URL, json: { a: 1 } });
		expect(calls).toEqual([PATCH_URL]);
	});

	test("falls back to latest only when the patch folder 404s", async () => {
		const { fetchFn, calls } = routedFetch({
			[PATCH_URL]: { status: 404 },
			[LATEST_URL]: { status: 200 },
		});
		const result = await fetchCommunityDragonItems("16.19.1", fetchFn);
		expect(result).toMatchObject({ patch: "latest", fallback: true, url: LATEST_URL });
		expect(calls).toEqual([PATCH_URL, LATEST_URL]);
	});

	test("does not fall back on other errors", async () => {
		const { fetchFn, calls } = routedFetch({ [PATCH_URL]: { status: 403 } });
		await expect(fetchCommunityDragonItems("16.19.1", fetchFn)).rejects.toThrow("HTTP 403");
		expect(calls).toEqual([PATCH_URL]);
	});

	test("rejects a body that is not JSON", async () => {
		const { fetchFn } = routedFetch({ [PATCH_URL]: { status: 200, body: "<html>" } });
		await expect(fetchCommunityDragonItems("16.19.1", fetchFn)).rejects.toThrow("Invalid JSON");
	});
});

describe("fetchWithRetry", () => {
	const FILE_URL = "https://example.test/file.json";

	test("retries 5xx and succeeds", async () => {
		const { fetchFn, calls } = routedFetch({ [FILE_URL]: [{ status: 503 }, { status: 200 }] });
		const response = await fetchWithRetry(FILE_URL, { fetchFn, baseDelayMs: 0 });
		expect(response.status).toBe(200);
		expect(calls).toHaveLength(2);
	});

	test("gives up after the retry budget", async () => {
		const { fetchFn, calls } = routedFetch({ [FILE_URL]: [{ status: 500 }, { status: 500 }, { status: 500 }] });
		await expect(fetchWithRetry(FILE_URL, { fetchFn, retries: 2, baseDelayMs: 0 })).rejects.toThrow("HTTP 500");
		expect(calls).toHaveLength(3);
	});
});

describe("mapWithConcurrency", () => {
	test("keeps order and never exceeds the limit", async () => {
		let inFlight = 0;
		let peak = 0;
		const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
			inFlight++;
			peak = Math.max(peak, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 8 - n));
			inFlight--;
			return n * 10;
		});
		expect(results).toEqual([10, 20, 30, 40, 50, 60, 70]);
		expect(peak).toBe(3);
	});

	test("stops taking new items after a failure", async () => {
		const started: number[] = [];
		const run = mapWithConcurrency([1, 2, 3, 4, 5], 1, async (n) => {
			started.push(n);
			if (n === 2) throw new Error("boom");
			return n;
		});
		await expect(run).rejects.toThrow("boom");
		expect(started).toEqual([1, 2]);
	});
});
