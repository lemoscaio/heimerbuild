import { defineConfig, devices } from "@playwright/test"

// BASE_URL points the flows at a deployed preview; without it they run against a local build.
const baseURL = process.env.BASE_URL || "http://localhost:4173"
const isCI = !!process.env.CI

export default defineConfig({
	testDir: "e2e",
	// `*.e2e.ts`, so `bun test` never picks the flows up as unit tests.
	testMatch: "**/*.e2e.ts",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: isCI ? 1 : 0,
	reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
	use: {
		baseURL,
		trace: "retain-on-failure",
		// Blocks Data Dragon in the browser's own resolver: `context.route` would pause every request
		// for the test worker, which a busy machine starves (PR body, issue 220).
		launchOptions: {
			args: ["--host-resolver-rules=MAP ddragon.leagueoflegends.com ~NOTFOUND"],
		},
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: process.env.BASE_URL
		? undefined
		: {
				command:
					"bun run build && bun run preview:local --port 4173 --strictPort",
				url: baseURL,
				timeout: 180_000,
				reuseExistingServer: !isCI,
			},
})
