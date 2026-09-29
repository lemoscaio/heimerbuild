import { fileURLToPath, URL } from "node:url"
import babel from "@rolldown/plugin-babel"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Cloudflare Workers Builds sets WORKERS_CI, WORKERS_CI_BRANCH and WORKERS_CI_COMMIT_SHA.
const branch = process.env.WORKERS_CI_BRANCH
const appEnvironment = !process.env.WORKERS_CI
	? "development"
	: branch === "main"
		? "production"
		: "preview"
const appRelease = process.env.WORKERS_CI_COMMIT_SHA
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN
// Source maps exist only to be uploaded; the plugin deletes them from dist afterwards.
const uploadSourceMaps = !!sentryAuthToken && !!appRelease

export default defineConfig({
	plugins: [
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		tailwindcss(),
		uploadSourceMaps &&
			sentryVitePlugin({
				org: "caio-lemos",
				project: "heimerbuild-web",
				authToken: sentryAuthToken,
				release: { name: appRelease },
				sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
				telemetry: false,
			}),
	],
	define: {
		// TEMP diagnostic: names only, never values. Revert before merge.
		__HB_BUILD_ENV_KEYS__: JSON.stringify(
			Object.keys(process.env)
				.filter((key) => /^(VITE_|SENTRY|WORKERS_|CF_|CI$|NODE_ENV)/.test(key))
				.sort()
				.join(","),
		),
		"import.meta.env.APP_ENVIRONMENT": JSON.stringify(appEnvironment),
		"import.meta.env.APP_RELEASE": appRelease
			? JSON.stringify(appRelease)
			: "undefined",
		// Tree-shakes Sentry's debug logging and the Replay iframe/shadow DOM recording we never use.
		__SENTRY_DEBUG__: false,
		__RRWEB_EXCLUDE_IFRAME__: true,
		__RRWEB_EXCLUDE_SHADOW_DOM__: true,
	},
	build: {
		sourcemap: uploadSourceMaps ? "hidden" : false,
	},
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
})
