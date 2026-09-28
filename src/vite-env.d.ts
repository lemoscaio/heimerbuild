/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Set at build time in vite.config.ts from the Cloudflare Workers Builds variables. */
	readonly SENTRY_ENVIRONMENT: "development" | "preview" | "production"
	/** The deployed commit SHA; undefined outside Workers Builds. */
	readonly SENTRY_RELEASE: string | undefined
	/** "true" sends Sentry events from a local build or dev server. */
	readonly VITE_SENTRY_ENABLED?: string
}
