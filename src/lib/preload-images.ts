const requested = new Set<string>()

/** Starts downloading images into the browser cache, once per URL, so later `<img>`s show at once. */
export function preloadImages(urls: Iterable<string>) {
	for (const url of urls) {
		if (requested.has(url)) continue
		requested.add(url)
		const image = new Image()
		image.decoding = "async"
		image.src = url
	}
}
