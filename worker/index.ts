import { SENTRY_TUNNEL_PATH } from "../src/app/sentry-config"
import { plainResponse } from "./plain-response"
import { isPostHogProxyPath, proxyPostHog } from "./posthog-proxy"
import { forwardEnvelope } from "./sentry-tunnel"

type Env = {
	ASSETS: { fetch: (request: Request) => Promise<Response> }
}

// Missing files here must 404: the SPA fallback would serve index.html
// with 200 under the immutable cache rule from public/_headers.
const STATIC_PREFIXES = ["/data/", "/assets/"]

function isStaticPath(pathname: string): boolean {
	return STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isHtml(response: Response): boolean {
	return response.headers.get("Content-Type")?.startsWith("text/html") ?? false
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url)
		if (pathname === SENTRY_TUNNEL_PATH) {
			return forwardEnvelope(request)
		}
		if (isPostHogProxyPath(pathname)) {
			return proxyPostHog(request)
		}

		const response = await env.ASSETS.fetch(request)

		const isMissing = response.status === 404 || isHtml(response)
		if (!isStaticPath(pathname) || !isMissing) {
			return response
		}

		return plainResponse(404, "Not Found", { "Cache-Control": "no-store" })
	},
}
