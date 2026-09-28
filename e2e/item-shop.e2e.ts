import { expect } from "@playwright/test"
import { currentItems, itemNames, shopItems, test } from "./fixtures"

test("the shop filters by a stat and sorts by it", async ({
	page,
	request,
}) => {
	const items = await currentItems(request)
	const abilityPowerOf = new Map(
		items.map((item) => [item.name, item.stats.abilityPower ?? 0]),
	)
	const withAbilityPower = items.filter(
		(item) => (item.stats.abilityPower ?? 0) !== 0,
	)
	const highestFirst = withAbilityPower
		.map((item) => item.stats.abilityPower ?? 0)
		.sort((a, b) => b - a)

	await page.goto("/champions/Heimerdinger")
	const shop = shopItems(page)
	await expect(shop).toHaveCount(items.length)

	const statFilter = page.getByRole("group", { name: "Filter by stat" })
	await statFilter.getByRole("button", { name: "Ability Power" }).click()
	await expect(
		statFilter.getByRole("button", { name: "Ability Power", pressed: true }),
	).toBeVisible()
	await expect(shop).toHaveCount(withAbilityPower.length)
	expect((await itemNames(shop)).sort()).toEqual(
		withAbilityPower.map((item) => item.name).sort(),
	)

	await page.getByLabel("Sort by").selectOption("abilityPower")
	await expect
		.poll(async () =>
			(await itemNames(shop)).map((name) => abilityPowerOf.get(name)),
		)
		.toEqual(highestFirst)
})
