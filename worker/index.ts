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
		const response = await env.ASSETS.fetch(request)
		const { pathname } = new URL(request.url)

		const isMissing = response.status === 404 || isHtml(response)
		if (!isStaticPath(pathname) || !isMissing) {
			return response
		}

		return new Response("Not Found", {
			status: 404,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "no-store",
			},
		})
	},
}
