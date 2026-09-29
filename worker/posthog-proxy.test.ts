import { describe, expect, test } from "bun:test"
import { POSTHOG_API_HOST, POSTHOG_ASSET_HOST } from "../src/app/posthog-config"
import { isPostHogProxyPath, proxyPostHog } from "./posthog-proxy"

function upstreamReturning(response: Response) {
	const calls: { url: string; init: RequestInit | undefined }[] = []
	const fetchFn = (async (url: string, init?: RequestInit) => {
		calls.push({ url, init })
		return response
	}) as typeof fetch
	return { fetchFn, calls }
}

describe("isPostHogProxyPath", () => {
	test.each([
		["/ingest/e/", true],
		["/ingest/static/array.js", true],
		["/ingestion", false],
		["/champions/ingest/e/", false],
	])("%s -> %p", (pathname, expected) => {
		expect(isPostHogProxyPath(pathname)).toBe(expected)
	})
})

describe("proxyPostHog", () => {
	test("forwards an event batch to the API host with its query and body", async () => {
		const { fetchFn, calls } = upstreamReturning(new Response('{"status":1}'))
		const body = '{"event":"item_added"}'

		const response = await proxyPostHog(
			new Request("https://example.com/ingest/e/?ip=0&ver=1.434.17", {
				method: "POST",
				body,
			}),
			{ fetchFn },
		)

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('{"status":1}')
		expect(calls).toHaveLength(1)
		expect(calls[0]?.url).toBe(
			`https://${POSTHOG_API_HOST}/e/?ip=0&ver=1.434.17`,
		)
		expect(calls[0]?.init?.method).toBe("POST")
		expect(new TextDecoder().decode(calls[0]?.init?.body as ArrayBuffer)).toBe(
			body,
		)
	})

	test.each([
		["/ingest/static/web-vitals.js?v=1", "/static/web-vitals.js?v=1"],
		["/ingest/array/phc_key/config.js", "/array/phc_key/config.js"],
	])("serves %s from the asset host", async (path, upstreamPath) => {
		const { fetchFn, calls } = upstreamReturning(new Response("js"))

		await proxyPostHog(new Request(`https://example.com${path}`), { fetchFn })

		expect(calls[0]?.url).toBe(`https://${POSTHOG_ASSET_HOST}${upstreamPath}`)
	})

	test.each(["/ingest//evil.example.com/e/", "/ingest/@evil.example.com/e/"])(
		"keeps %s on PostHog's API host",
		async (path) => {
			const { fetchFn, calls } = upstreamReturning(new Response("{}"))

			await proxyPostHog(new Request(`https://example.com${path}`), { fetchFn })

			expect(new URL(calls[0]?.url ?? "").host).toBe(POSTHOG_API_HOST)
		},
	)

	test("sends the visitor's IP and never our cookies or credentials", async () => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))

		await proxyPostHog(
			new Request("https://example.com/ingest/flags/?v=2", {
				method: "POST",
				body: "{}",
				headers: {
					"CF-Connecting-IP": "203.0.113.7",
					"X-Forwarded-For": "198.51.100.1",
					Cookie: "session=secret",
					Authorization: "Bearer secret",
					"Content-Type": "application/json",
				},
			}),
			{ fetchFn },
		)

		const headers = new Headers(calls[0]?.init?.headers)
		expect(headers.get("X-Forwarded-For")).toBe("203.0.113.7")
		expect(headers.get("Cookie")).toBeNull()
		expect(headers.get("Authorization")).toBeNull()
		expect(headers.get("Content-Type")).toBe("application/json")
	})

	test("passes PostHog's status and headers back, without cookies", async () => {
		const { fetchFn } = upstreamReturning(
			new Response("rate limited", {
				status: 429,
				headers: {
					"Content-Type": "text/plain",
					"Cache-Control": "no-cache",
					"Set-Cookie": "ph=1",
				},
			}),
		)

		const response = await proxyPostHog(
			new Request("https://example.com/ingest/e/", {
				method: "POST",
				body: "{}",
			}),
			{ fetchFn },
		)

		expect(response.status).toBe(429)
		expect(response.headers.get("Cache-Control")).toBe("no-cache")
		expect(response.headers.get("Set-Cookie")).toBeNull()
	})

	test.each([
		["DELETE", "/ingest/e/", "GET, HEAD, POST"],
		["POST", "/ingest/static/array.js", "GET, HEAD"],
	])("rejects %s %s without calling PostHog", async (method, path, allow) => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))

		const response = await proxyPostHog(
			new Request(`https://example.com${path}`, { method }),
			{ fetchFn },
		)

		expect(response.status).toBe(405)
		expect(response.headers.get("Allow")).toBe(allow)
		expect(calls).toHaveLength(0)
	})

	test("answers 502 when PostHog cannot be reached", async () => {
		const fetchFn = (async () => {
			throw new TypeError("network down")
		}) as unknown as typeof fetch

		const response = await proxyPostHog(
			new Request("https://example.com/ingest/e/", {
				method: "POST",
				body: "{}",
			}),
			{ fetchFn },
		)

		expect(response.status).toBe(502)
	})
})
