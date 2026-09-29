import { afterEach, describe, expect, mock, spyOn, test } from "bun:test"
import { SENTRY_INGEST_HOST, SENTRY_PROJECT_ID } from "../src/app/sentry-config"
import worker from "./index"

// Any public key: the tunnel checks only the host and project.
const SENTRY_DSN = `https://publickey@${SENTRY_INGEST_HOST}/${SENTRY_PROJECT_ID}`

function envReturning(response: Response) {
	const requests: Request[] = []
	const env = {
		ASSETS: {
			fetch: async (request: Request) => {
				requests.push(request)
				return response
			},
		},
	}
	return { env, requests }
}

const immutable = "public, max-age=31536000, immutable"

describe("worker", () => {
	test("passes an existing static file through unchanged", async () => {
		const asset = new Response('{"ok":true}', {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": immutable,
			},
		})
		const { env, requests } = envReturning(asset)
		const request = new Request("https://example.com/data/16.19.1/items.json")

		const response = await worker.fetch(request, env)

		expect(response).toBe(asset)
		expect(requests).toEqual([request])
	})

	test("turns the SPA index.html fallback into an uncached 404", async () => {
		const { env } = envReturning(
			new Response("<!doctype html>", {
				headers: { "Content-Type": "text/html", "Cache-Control": immutable },
			}),
		)

		const response = await worker.fetch(
			new Request("https://example.com/data/99.99.99/items.json"),
			env,
		)

		expect(response.status).toBe(404)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
		expect(await response.text()).toBe("Not Found")
	})

	test("detects the fallback when the content type has a charset", async () => {
		const { env } = envReturning(
			new Response("<!doctype html>", {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			}),
		)

		const response = await worker.fetch(
			new Request("https://example.com/assets/missing.js"),
			env,
		)

		expect(response.status).toBe(404)
	})

	test("keeps the SPA fallback for app routes", async () => {
		const fallback = new Response("<!doctype html>", {
			headers: { "Content-Type": "text/html" },
		})
		const { env } = envReturning(fallback)

		const response = await worker.fetch(
			new Request("https://example.com/champions/Heimerdinger"),
			env,
		)

		expect(response).toBe(fallback)
	})

	test("adds no-store to a plain asset 404", async () => {
		const { env } = envReturning(new Response("Not found", { status: 404 }))

		const response = await worker.fetch(
			new Request("https://example.com/assets/missing.js"),
			env,
		)

		expect(response.status).toBe(404)
		expect(response.headers.get("Cache-Control")).toBe("no-store")
	})

	describe("Sentry tunnel", () => {
		afterEach(() => {
			mock.restore()
		})

		test("forwards /monitoring to Sentry without touching the assets", async () => {
			const upstream = spyOn(globalThis, "fetch").mockResolvedValue(
				new Response("{}"),
			)
			const { env, requests } = envReturning(new Response("asset"))

			const response = await worker.fetch(
				new Request("https://example.com/monitoring", {
					method: "POST",
					body: `${JSON.stringify({ dsn: SENTRY_DSN })}\n{}`,
				}),
				env,
			)

			expect(response.status).toBe(200)
			expect(upstream).toHaveBeenCalledTimes(1)
			expect(requests).toEqual([])
		})
	})

	describe("PostHog proxy", () => {
		afterEach(() => {
			mock.restore()
		})

		test("forwards /ingest/* to PostHog without touching the assets", async () => {
			const upstream = spyOn(globalThis, "fetch").mockResolvedValue(
				new Response('{"status":1}'),
			)
			const { env, requests } = envReturning(new Response("asset"))

			const response = await worker.fetch(
				new Request("https://example.com/ingest/e/", {
					method: "POST",
					body: "{}",
				}),
				env,
			)

			expect(response.status).toBe(200)
			expect(upstream).toHaveBeenCalledTimes(1)
			expect(requests).toEqual([])
		})
	})
})
