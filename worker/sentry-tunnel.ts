import { z } from "zod"
import { SENTRY_INGEST_HOST, SENTRY_PROJECT_ID } from "../src/app/sentry-config"
import { plainResponse } from "./plain-response"

// Checked against committed routing constants: wrangler bundles the Worker without the
// VITE_SENTRY_DSN build variable, and the DSN's public key never mattered for the check.
const ingestUrl = `https://${SENTRY_INGEST_HOST}/api/${SENTRY_PROJECT_ID}/envelope/`

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
			target.host === SENTRY_INGEST_HOST &&
			target.pathname.replace(/\/$/, "") === `/${SENTRY_PROJECT_ID}`
		)
	} catch {
		return false
	}
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
