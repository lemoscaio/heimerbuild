import { describe, expect, test } from "bun:test"
import { shouldInitSentry } from "./should-init-sentry"

describe("shouldInitSentry", () => {
	test.each(["preview", "production"] as const)(
		"starts Sentry on %s deploys",
		(environment) => {
			expect(
				shouldInitSentry({ environment, enabledLocally: false, isE2e: false }),
			).toBe(true)
		},
	)

	test("stays off locally unless enabled", () => {
		expect(
			shouldInitSentry({
				environment: "development",
				enabledLocally: false,
				isE2e: false,
			}),
		).toBe(false)
		expect(
			shouldInitSentry({
				environment: "development",
				enabledLocally: true,
				isE2e: false,
			}),
		).toBe(true)
	})

	test.each(["development", "preview", "production"] as const)(
		"never starts for an E2E run on %s",
		(environment) => {
			expect(
				shouldInitSentry({ environment, enabledLocally: true, isE2e: true }),
			).toBe(false)
		},
	)
})
