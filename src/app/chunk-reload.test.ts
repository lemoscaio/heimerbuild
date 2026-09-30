import { describe, expect, test } from "bun:test"
import { shouldReloadAfterChunkError } from "./chunk-reload"

const NOW = 1_000_000

describe("shouldReloadAfterChunkError", () => {
	test("reloads on the first chunk error of the tab", () => {
		expect(shouldReloadAfterChunkError(null, NOW)).toBe(true)
	})

	test("does not reload again when the chunk still fails right after a reload", () => {
		expect(shouldReloadAfterChunkError(String(NOW - 2_000), NOW)).toBe(false)
	})

	test("reloads for a later deploy once the guard window has passed", () => {
		expect(shouldReloadAfterChunkError(String(NOW - 60_000), NOW)).toBe(true)
	})

	test("treats a corrupted stored value as no previous reload", () => {
		expect(shouldReloadAfterChunkError("not-a-number", NOW)).toBe(true)
	})
})
