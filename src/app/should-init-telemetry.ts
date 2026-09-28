type ShouldInitTelemetryInput = {
	environment: ImportMetaEnv["APP_ENVIRONMENT"]
	/** The tool's local flag (VITE_SENTRY_ENABLED, VITE_POSTHOG_ENABLED) is "true". */
	enabledLocally: boolean
	/** The Playwright flows mark their pages (e2e/fixtures.ts) so test runs never report. */
	isE2e: boolean
}

/** Whether Sentry or PostHog starts: on deploys, off locally unless enabled, never in E2E runs. */
export function shouldInitTelemetry({
	environment,
	enabledLocally,
	isE2e,
}: ShouldInitTelemetryInput): boolean {
	if (isE2e) {
		return false
	}
	return environment !== "development" || enabledLocally
}
