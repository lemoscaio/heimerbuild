import { describe, expect, test } from "bun:test"
import { shouldInitTelemetry } from "./should-init-telemetry"

describe("shouldInitTelemetry", () => {
	test.each(["preview", "production"] as const)(
		"starts on %s deploys",
		(environment) => {
			expect(
				shouldInitTelemetry({
					environment,
					enabledLocally: false,
					isE2e: false,
				}),
			).toBe(true)
		},
	)

	test("stays off locally unless enabled", () => {
		expect(
			shouldInitTelemetry({
				environment: "development",
				enabledLocally: false,
				isE2e: false,
			}),
		).toBe(false)
		expect(
			shouldInitTelemetry({
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
				shouldInitTelemetry({ environment, enabledLocally: true, isE2e: true }),
			).toBe(false)
		},
	)
})
