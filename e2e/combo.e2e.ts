import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

function combo(page: Page) {
	return page.getByRole("region", { name: "Combo" })
}

/** One remove button per step card. */
function steps(page: Page) {
	return combo(page).getByRole("button", { name: /^Remove step / })
}

function damageTotal(page: Page) {
	return combo(page).getByLabel("Combo result").getByRole("definition").first()
}

test("Quinn's combo adds steps, reorders them by keyboard, removes one, and keeps out of the link", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&summoners=4,14",
	)
	await page.getByRole("tab", { name: "Combo" }).click()
	await expect(page).toHaveURL(/[?&]tab=combo\b/)

	await combo(page).getByRole("button", { name: "Add E, Vault" }).click()
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await combo(page).getByRole("button", { name: "Add Ignite" }).click()
	await expect(steps(page)).toHaveCount(3)
	await expect(damageTotal(page)).not.toHaveText("0")
	const withVaultFirst = await damageTotal(page).textContent()

	// The attack consumes Vault's mark only after it; moved first, it deals less.
	const attackHandle = combo(page).getByRole("button", {
		name: "Move step 2. Attack",
		exact: true,
	})
	await attackHandle.focus()
	await page.keyboard.press("ArrowUp")
	await expect(
		combo(page).getByRole("button", {
			name: "Move step 1. Attack",
			exact: true,
		}),
	).toBeFocused()
	await expect(damageTotal(page)).not.toHaveText(withVaultFirst ?? "")

	await combo(page)
		.getByRole("button", { name: "Remove step 3. Ignite" })
		.click()
	await expect(steps(page)).toHaveCount(2)
	await expect(page).not.toHaveURL(/combo=/)

	// The target's numbers change the result.
	const beforeTank = await damageTotal(page).textContent()
	await combo(page).getByRole("button", { name: "Tank" }).click()
	await expect(damageTotal(page)).not.toHaveText(beforeTank ?? "")
})

test("an ability on cooldown adds nothing to the totals, and a champion off the curated list marks what isn't modeled", async ({
	page,
}) => {
	await page.goto("/champions/Quinn?lvl=9&skills=QWEQEQRQE&tab=combo")
	const assault = combo(page).getByRole("button", {
		name: "Add Q, Blinding Assault",
	})
	await assault.click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const once = await damageTotal(page).textContent()
	await assault.click()
	await expect(steps(page)).toHaveCount(2)
	await expect(damageTotal(page)).toHaveText(once ?? "")
	await expect(assault).toHaveAccessibleDescription("")

	// Overload scales with Ryze's mana, which the formulas don't read.
	await page.goto("/champions/Ryze?lvl=9&skills=QWEQEQRQE&tab=combo")
	const overload = combo(page).getByRole("button", { name: "Add Q, Overload" })
	await expect(overload).toHaveAccessibleDescription(/\w/)
	await overload.click()
	await expect(steps(page)).toHaveCount(1)
	await expect(damageTotal(page)).toHaveText("0")
})

test("Zac's Unstable Matter deals a share of the target's maximum health, so a target with more health takes more", async ({
	page,
}) => {
	await page.goto("/champions/Zac?lvl=9&skills=WQEWWRWQE&tab=combo")
	const unstableMatter = combo(page).getByRole("button", {
		name: "Add W, Unstable Matter",
	})
	await expect(unstableMatter).toHaveAccessibleDescription("")
	await unstableMatter.click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const total = async () =>
		Number((await damageTotal(page).textContent())?.replace(/\D/g, ""))
	const onDummy = await total()

	const health = combo(page).getByRole("textbox", { name: "Target health" })
	await health.fill("3800")
	await health.press("Enter")
	await expect.poll(total).toBeGreaterThan(onDummy)
})
