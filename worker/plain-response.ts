/** A plain-text response, for the Worker's own errors. */
export function plainResponse(
	status: number,
	body: string,
	headers?: HeadersInit,
) {
	return new Response(body, {
		status,
		headers: { "Content-Type": "text/plain; charset=utf-8", ...headers },
	})
}
