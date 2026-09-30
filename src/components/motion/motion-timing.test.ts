import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

// A duration or delay written as a number instead of a token from tokens.ts.
const NUMERIC_TIMING =
	/\b(duration|delay|delayChildren|staggerChildren|repeatDelay)\s*:\s*-?\.?\d|\bstagger\(\s*-?\.?\d/g

function numericTimings(source: string) {
	return source.match(NUMERIC_TIMING) ?? []
}

function motionFiles() {
	const files = [
		...new Bun.Glob("src/**/*.motion.tsx").scanSync(),
		...new Bun.Glob("src/components/motion/**/*.{ts,tsx}").scanSync(),
	]
	return files.filter(
		(file) => !file.endsWith("/tokens.ts") && !file.endsWith(".test.ts"),
	)
}

describe("motion timing", () => {
	test("spots numeric durations and delays", () => {
		expect(numericTimings("{ duration: 0.4, ease }")).toHaveLength(1)
		expect(numericTimings("{ delay: .1 }")).toHaveLength(1)
		expect(numericTimings("delayChildren: stagger(0.02)")).toHaveLength(1)
		expect(numericTimings("{ duration: duration.fast }")).toHaveLength(0)
	})

	test("motion files take durations and delays from the tokens", () => {
		const files = motionFiles()
		expect(files.length).toBeGreaterThan(0)
		for (const file of files) {
			expect({
				file,
				found: numericTimings(readFileSync(file, "utf8")),
			}).toEqual({ file, found: [] })
		}
	})
})
