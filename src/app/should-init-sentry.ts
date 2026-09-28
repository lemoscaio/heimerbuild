type ShouldInitSentryInput = {
	environment: ImportMetaEnv["SENTRY_ENVIRONMENT"]
	/** VITE_SENTRY_ENABLED=true: report from a local build or dev server. */
	enabledLocally: boolean
	/** The Playwright flows mark their pages (e2e/fixtures.ts) so test runs never reach Sentry. */
	isE2e: boolean
}

export function shouldInitSentry({
	environment,
	enabledLocally,
	isE2e,
}: ShouldInitSentryInput): boolean {
	if (isE2e) {
		return false
	}
	return environment !== "development" || enabledLocally
}
