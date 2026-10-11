const NEW_ISSUE_URL = "https://github.com/lemoscaio/heimerbuild/issues/new"

/** A new GitHub issue prefilled with the page it came from (the full link, build included, in the body). */
export function bugReportUrl(page: URL): string {
	const params = new URLSearchParams({
		title: `Wrong number on ${page.pathname}`,
		body: [
			`Page: ${page.href}`,
			"",
			"What looks wrong:",
			"",
			"What the game shows (and how you checked it):",
			"",
		].join("\n"),
	})
	return `${NEW_ISSUE_URL}?${params}`
}
