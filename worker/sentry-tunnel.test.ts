import { describe, expect, test } from "bun:test"
import { SENTRY_INGEST_HOST, SENTRY_PROJECT_ID } from "../src/app/sentry-config"
import { forwardEnvelope } from "./sentry-tunnel"

// Any public key: the tunnel checks only the host and project.
const SENTRY_DSN = `https://publickey@${SENTRY_INGEST_HOST}/${SENTRY_PROJECT_ID}`

const INGEST_URL =
	"https://o4510932658159616.ingest.us.sentry.io/api/4512166096535553/envelope/"

function envelope(dsn: unknown) {
	return `${JSON.stringify({ dsn, sent_at: "2026-09-28T00:00:00Z" })}\n{"type":"event"}\n{"message":"boom"}`
}

function post(body: BodyInit, url = "https://example.com/monitoring") {
	return new Request(url, { method: "POST", body })
}

function upstreamReturning(response: Response) {
	const calls: { url: string; init: RequestInit | undefined }[] = []
	const fetchFn = (async (url: string, init?: RequestInit) => {
		calls.push({ url, init })
		return response
	}) as typeof fetch
	return { fetchFn, calls }
}

describe("forwardEnvelope", () => {
	test("forwards our project's envelope to its ingest endpoint unchanged", async () => {
		const { fetchFn, calls } = upstreamReturning(
			new Response('{"id":"abc"}', {
				headers: { "Content-Type": "application/json" },
			}),
		)
		const body = envelope(SENTRY_DSN)

		const response = await forwardEnvelope(post(body), { fetchFn })

		expect(response.status).toBe(200)
		expect(await response.text()).toBe('{"id":"abc"}')
		expect(calls).toHaveLength(1)
		expect(calls[0]?.url).toBe(INGEST_URL)
		expect(calls[0]?.init?.method).toBe("POST")
		expect(new TextDecoder().decode(calls[0]?.init?.body as Uint8Array)).toBe(
			body,
		)
	})

	test("keeps binary items after the header byte for byte", async () => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))
		const header = new TextEncoder().encode(`${envelope(SENTRY_DSN)}\n`)
		const binary = new Uint8Array([0x1f, 0x8b, 0x00, 0xff, 0x0a, 0x80])
		const body = new Uint8Array([...header, ...binary])

		await forwardEnvelope(post(body), { fetchFn })

		expect(calls[0]?.init?.body).toEqual(body)
	})

	test("passes Sentry's status and rate-limit headers back to the SDK", async () => {
		const { fetchFn } = upstreamReturning(
			new Response("", {
				status: 429,
				headers: {
					"Retry-After": "60",
					"X-Sentry-Rate-Limits": "60:error:organization",
					"Set-Cookie": "session=secret",
				},
			}),
		)

		const response = await forwardEnvelope(post(envelope(SENTRY_DSN)), {
			fetchFn,
		})

		expect(response.status).toBe(429)
		expect(response.headers.get("Retry-After")).toBe("60")
		expect(response.headers.get("X-Sentry-Rate-Limits")).toBe(
			"60:error:organization",
		)
		expect(response.headers.get("Set-Cookie")).toBeNull()
	})

	test.each([
		["another host", "https://publickey@evil.example.com/4512166096535553"],
		[
			"another project",
			"https://publickey@o4510932658159616.ingest.us.sentry.io/1",
		],
		[
			"a host that only starts like ours",
			"https://key@o4510932658159616.ingest.us.sentry.io.evil.example.com/4512166096535553",
		],
		[
			"plain http",
			"http://publickey@o4510932658159616.ingest.us.sentry.io/4512166096535553",
		],
	])("rejects an envelope for %s without calling Sentry", async (_, dsn) => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))

		const response = await forwardEnvelope(post(envelope(dsn)), { fetchFn })

		expect(response.status).toBe(400)
		expect(calls).toHaveLength(0)
	})

	test.each([
		["an empty body", ""],
		["a header that is not JSON", "not json\n{}"],
		["a header without a DSN", '{"event_id":"abc"}\n{}'],
		["a DSN that is not a URL", envelope("nope")],
	])("rejects %s", async (_, body) => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))

		const response = await forwardEnvelope(post(body), { fetchFn })

		expect(response.status).toBe(400)
		expect(calls).toHaveLength(0)
	})

	test("only accepts POST", async () => {
		const { fetchFn, calls } = upstreamReturning(new Response("{}"))

		const response = await forwardEnvelope(
			new Request("https://example.com/monitoring"),
			{ fetchFn },
		)

		expect(response.status).toBe(405)
		expect(response.headers.get("Allow")).toBe("POST")
		expect(calls).toHaveLength(0)
	})

	test("answers 502 when Sentry cannot be reached", async () => {
		const fetchFn = (async () => {
			throw new TypeError("network down")
		}) as unknown as typeof fetch

		const response = await forwardEnvelope(post(envelope(SENTRY_DSN)), {
			fetchFn,
		})

		expect(response.status).toBe(502)
	})
})
