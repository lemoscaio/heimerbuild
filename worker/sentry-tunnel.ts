import { z } from "zod"
import { SENTRY_DSN } from "../src/app/sentry-config"

const dsn = new URL(SENTRY_DSN)
const projectId = dsn.pathname.slice(1)
const ingestUrl = `https://${dsn.host}/api/${projectId}/envelope/`

// Content-Type plus the rate-limit headers the SDK reads to back off.
const FORWARDED_HEADERS = [
	"Content-Type",
	"Retry-After",
	"X-Sentry-Rate-Limits",
]

const envelopeHeaderSchema = z.object({ dsn: z.url() })

type ForwardEnvelopeOptions = {
	fetchFn?: typeof fetch
}

function isOwnProject(envelope: Uint8Array): boolean {
	const headerEnd = envelope.indexOf(0x0a)
	const headerLine = new TextDecoder().decode(
		headerEnd === -1 ? envelope : envelope.subarray(0, headerEnd),
	)
	try {
		const target = new URL(
			envelopeHeaderSchema.parse(JSON.parse(headerLine)).dsn,
		)
		return (
			target.protocol === "https:" &&
			target.host === dsn.host &&
			target.pathname.replace(/\/$/, "") === `/${projectId}`
		)
	} catch {
		return false
	}
}

function plainResponse(status: number, body: string, headers?: HeadersInit) {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	})
}

/**
 * Forwards a Sentry envelope from the browser SDK (`tunnel` option) to our project's ingest
 * endpoint. Envelopes for any other host or project are rejected, so this is not an open proxy.
 */
export async function forwardEnvelope(
	request: Request,
	{ fetchFn = fetch }: ForwardEnvelopeOptions = {},
): Promise<Response> {
	if (request.method !== "POST") {
		return plainResponse(405, "Method Not Allowed", { Allow: "POST" })
	}

	const envelope = new Uint8Array(await request.arrayBuffer())
	if (!isOwnProject(envelope)) {
		return plainResponse(400, "Invalid envelope")
	}

	let upstream: Response
	try {
		upstream = await fetchFn(ingestUrl, {
			method: "POST",
			body: envelope,
			headers: { "Content-Type": "application/x-sentry-envelope" },
		})
	} catch {
		return plainResponse(502, "Bad Gateway")
	}

	const headers = new Headers()
	for (const name of FORWARDED_HEADERS) {
		const value = upstream.headers.get(name)
		if (value !== null) {
			headers.set(name, value)
		}
	}
	return new Response(upstream.body, { status: upstream.status, headers })
}
