import { describe, expect, test } from "bun:test"
import { type AnalyticsClient, createAnalytics } from "./analytics"

function fakeClient(flags: Record<string, boolean | string> = {}) {
	const captured: { event: string; properties: Record<string, unknown> }[] = []
	let flagsCallback: (() => void) | undefined
	const client: AnalyticsClient = {
		capture: (event, properties) => {
			captured.push({ event, properties })
		},
		getFeatureFlag: (name) => flags[name],
		onFeatureFlags: (callback) => {
			flagsCallback = callback
			return () => {}
		},
	}
	return {
		client,
		captured,
		changeFlags: (next: Record<string, boolean | string>) => {
			Object.assign(flags, next)
			flagsCallback?.()
		},
	}
}

describe("createAnalytics", () => {
	test("drops events while analytics is off", async () => {
		const analytics = createAnalytics()
		const { client, captured } = fakeClient()

		analytics.track("item_added", { itemId: "3089" })
		await analytics.connect(async () => client)

		expect(captured).toEqual([])
	})

	test("sends events tracked while the client loads, in order, then the next ones directly", async () => {
		const analytics = createAnalytics()
		const { client, captured } = fakeClient()
		let resolveClient: (client: AnalyticsClient) => void = () => {}

		const connecting = analytics.connect(
			() => new Promise((resolve) => (resolveClient = resolve)),
		)
		analytics.track("champion_selected", { champion: "Heimerdinger" })
		analytics.track("item_added", { itemId: "3089" })
		resolveClient(client)
		await connecting
		analytics.track("item_removed", { itemId: "3089" })

		expect(captured).toEqual([
			{ event: "champion_selected", properties: { champion: "Heimerdinger" } },
			{ event: "item_added", properties: { itemId: "3089" } },
			{ event: "item_removed", properties: { itemId: "3089" } },
		])
	})

	test("keeps at most 50 events while loading", async () => {
		const analytics = createAnalytics()
		const { client, captured } = fakeClient()
		let resolveClient: (client: AnalyticsClient) => void = () => {}

		const connecting = analytics.connect(
			() => new Promise((resolve) => (resolveClient = resolve)),
		)
		for (let level = 0; level < 60; level++) {
			analytics.track("level_changed", { level })
		}
		resolveClient(client)
		await connecting

		expect(captured).toHaveLength(50)
	})

	test("drops queued events and stays quiet when the client fails to load", async () => {
		const analytics = createAnalytics()

		const connecting = analytics.connect(async () => {
			throw new Error("chunk failed")
		})
		analytics.track("item_added", { itemId: "3089" })
		await connecting

		expect(() =>
			analytics.track("item_added", { itemId: "3089" }),
		).not.toThrow()
		expect(analytics.getFeatureFlag("new-shop")).toBeUndefined()
	})

	test("reads flags from the client once loaded and notifies subscribers of changes", async () => {
		const analytics = createAnalytics()
		const { client, changeFlags } = fakeClient({ "new-shop": false })
		let notifications = 0
		const unsubscribe = analytics.subscribeToFeatureFlags(() => {
			notifications++
		})

		expect(analytics.getFeatureFlag("new-shop")).toBeUndefined()
		await analytics.connect(async () => client)
		expect(analytics.getFeatureFlag("new-shop")).toBe(false)
		changeFlags({ "new-shop": "variant-a" })
		expect(analytics.getFeatureFlag("new-shop")).toBe("variant-a")
		expect(notifications).toBe(2)

		unsubscribe()
		changeFlags({ "new-shop": true })
		expect(notifications).toBe(2)
	})
})
