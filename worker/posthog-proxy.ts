import {
	POSTHOG_API_HOST,
	POSTHOG_ASSET_HOST,
	POSTHOG_PROXY_PATH,
} from "../src/app/posthog-config"
import { plainResponse } from "./plain-response"

const ASSET_PREFIXES = ["/static/", "/array/"]
const API_METHODS = ["GET", "HEAD", "POST"]
const ASSET_METHODS = ["GET", "HEAD"]
// Never sent to PostHog: our cookies and any credentials.
const DROPPED_REQUEST_HEADERS = ["Cookie", "Authorization"]

type ProxyPostHogOptions = {
	fetchFn?: typeof fetch
}

export function isPostHogProxyPath(pathname: string): boolean {
	return pathname.startsWith(`${POSTHOG_PROXY_PATH}/`)
}

/**
 * Forwards `/ingest/*` to our PostHog cloud region, as in PostHog's Cloudflare proxy guide:
 * `/ingest/static/*` and `/ingest/array/*` to the asset host, the rest to the API host.
 */
export async function proxyPostHog(
	request: Request,
	{ fetchFn = fetch }: ProxyPostHogOptions = {},
): Promise<Response> {
	const url = new URL(request.url)
	const path = url.pathname.slice(POSTHOG_PROXY_PATH.length)
	const isAsset = ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))
	const allowedMethods = isAsset ? ASSET_METHODS : API_METHODS
	if (!allowedMethods.includes(request.method)) {
		return plainResponse(405, "Method Not Allowed", {
			Allow: allowedMethods.join(", "),
		})
	}

	// Concatenated, never resolved with `new URL(path, base)`: a path like `//evil.com` stays on our host.
	const target = `https://${isAsset ? POSTHOG_ASSET_HOST : POSTHOG_API_HOST}${path}${url.search}`
	const headers = new Headers(request.headers)
	for (const name of DROPPED_REQUEST_HEADERS) headers.delete(name)
	// PostHog's cookieless user hash and geolocation need the visitor's IP, not Cloudflare's.
	headers.set("X-Forwarded-For", request.headers.get("CF-Connecting-IP") ?? "")

	let upstream: Response
	try {
		upstream = await fetchFn(target, {
			method: request.method,
			headers,
			body: request.method === "POST" ? await request.arrayBuffer() : null,
		})
	} catch {
		return plainResponse(502, "Bad Gateway")
	}

	const responseHeaders = new Headers(upstream.headers)
	responseHeaders.delete("Set-Cookie")
	return new Response(upstream.body, {
		status: upstream.status,
		statusText: upstream.statusText,
		headers: responseHeaders,
	})
}
