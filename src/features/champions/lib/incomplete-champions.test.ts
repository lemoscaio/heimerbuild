import { describe, expect, test } from "bun:test"
import {
	findIncompleteChampion,
	INCOMPLETE_CHAMPIONS,
} from "./incomplete-champions"

const DATA = new URL("../../../../public/data/", import.meta.url)
const { currentPatch } = await Bun.file(new URL("manifest.json", DATA)).json()

describe("findIncompleteChampion", () => {
	test.each(["Aphelios", "RekSai"])("%s is incomplete", (key) => {
		expect(findIncompleteChampion(key)?.championKey).toBe(key)
	})

	test("a fully modeled champion is not", () => {
		expect(findIncompleteChampion("Ahri")).toBeUndefined()
	})

	test("matches the data file's key exactly", () => {
		expect(findIncompleteChampion("reksai")).toBeUndefined()
	})

	test.each(INCOMPLETE_CHAMPIONS.map(({ championKey }) => championKey))(
		"%s is a champion of the current patch",
		async (key) => {
			const file = Bun.file(
				new URL(`${currentPatch}/champions/${key}.json`, DATA),
			)
			expect(await file.exists()).toBe(true)
		},
	)
})
