import { describe, expect, test } from "bun:test"
import { shouldInitTelemetry } from "./should-init-telemetry"

const projectKey = "phc_test"

describe("shouldInitTelemetry", () => {
	test.each(["preview", "production"] as const)(
		"starts on %s deploys that have a key",
		(environment) => {
			expect(
				shouldInitTelemetry({
					environment,
					projectKey,
					enabledLocally: false,
					isE2e: false,
				}),
			).toBe(true)
		},
	)

	test.each([
		["no", undefined],
		["an empty", ""],
	])("never starts with %s key", (_, missingKey) => {
		for (const environment of [
			"development",
			"preview",
			"production",
		] as const) {
			expect(
				shouldInitTelemetry({
					environment,
					projectKey: missingKey,
					enabledLocally: true,
					isE2e: false,
				}),
			).toBe(false)
		}
	})

	test("stays off locally unless enabled", () => {
		expect(
			shouldInitTelemetry({
				environment: "development",
				projectKey,
				enabledLocally: false,
				isE2e: false,
			}),
		).toBe(false)
		expect(
			shouldInitTelemetry({
				environment: "development",
				projectKey,
				enabledLocally: true,
				isE2e: false,
			}),
		).toBe(true)
	})

	test.each(["development", "preview", "production"] as const)(
		"never starts for an E2E run on %s",
		(environment) => {
			expect(
				shouldInitTelemetry({
					environment,
					projectKey,
					enabledLocally: true,
					isE2e: true,
				}),
			).toBe(false)
		},
	)
})
