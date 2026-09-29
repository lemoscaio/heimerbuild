type ShouldInitTelemetryInput = {
	environment: ImportMetaEnv["APP_ENVIRONMENT"]
	/** VITE_SENTRY_DSN or VITE_POSTHOG_KEY: builds without it (forks, CI) never report. */
	projectKey: string | undefined
	/** The tool's local flag (VITE_SENTRY_ENABLED, VITE_POSTHOG_ENABLED) is "true". */
	enabledLocally: boolean
	/** The Playwright flows mark their pages (e2e/fixtures.ts) so test runs never report. */
	isE2e: boolean
}

/** Whether Sentry or PostHog starts: on deploys, off locally unless enabled, never in E2E runs. */
export function shouldInitTelemetry({
	environment,
	projectKey,
	enabledLocally,
	isE2e,
}: ShouldInitTelemetryInput): boolean {
	if (isE2e || !projectKey) {
		return false
	}
	return environment !== "development" || enabledLocally
}
