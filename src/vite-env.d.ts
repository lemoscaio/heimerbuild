/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Set at build time in vite.config.ts from the Cloudflare Workers Builds variables. */
	readonly APP_ENVIRONMENT: "development" | "preview" | "production"
	/** The deployed commit SHA; undefined outside Workers Builds. */
	readonly APP_RELEASE: string | undefined
	/** "true" sends Sentry events from a local build or dev server. */
	readonly VITE_SENTRY_ENABLED?: string
	/** "true" sends PostHog events from a local build or dev server. */
	readonly VITE_POSTHOG_ENABLED?: string
}

interface Window {
	/** Set by the Playwright flows before any script runs (e2e/fixtures.ts): Sentry and PostHog stay off. */
	__HB_E2E__?: boolean
}
