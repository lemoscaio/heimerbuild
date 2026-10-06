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

test("Quinn's combo adds steps, moves one up with its button, removes one, and keeps out of the link", async ({
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
	await expect(
		combo(page).getByRole("button", { name: "Move step 1, E · Vault up" }),
	).toBeDisabled()
	await expect(
		combo(page).getByRole("button", { name: "Move step 3, Ignite down" }),
	).toBeDisabled()
	await combo(page)
		.getByRole("button", { name: "Move step 2, Attack up" })
		.click()
	// The button keeps the focus at the top, where it can't move further.
	const attackUp = combo(page).getByRole("button", {
		name: "Move step 1, Attack up",
	})
	await expect(attackUp).toBeFocused()
	await expect(attackUp).toBeDisabled()
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

test("a situation marker sets Harrier's mark from where it is, and only the build's situations show", async ({
	page,
}) => {
	await page.goto("/champions/Quinn?lvl=9&skills=QWEQEQRQE&tab=combo")
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const plain = await damageTotal(page).textContent()

	// Added at the end, after the attack: nothing changes until it moves above it.
	const situation = combo(page).getByRole("region", { name: "Situation" })
	await situation
		.getByRole("button", { name: "Add marker: Target marked by Harrier" })
		.click()
	await expect(damageTotal(page)).toHaveText(plain ?? "")
	await combo(page)
		.getByRole("button", { name: "Move marker Target marked by Harrier up" })
		.click()
	await expect(damageTotal(page)).not.toHaveText(plain ?? "")

	await page.goto("/champions/Annie?lvl=9&skills=QWEQEQRQE&tab=combo")
	await expect(
		combo(page).getByRole("button", { name: "Add Attack" }),
	).toBeVisible()
	await expect(
		combo(page).getByRole("region", { name: "Situation" }),
	).toHaveCount(0)
})

test("Hail of Blades' marker moves and is removed like a step, with Undo", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&runes=8100-9923-0-0-0__&tab=combo",
	)
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await attack.click()
	await attack.click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const plain = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Add marker: Hail of Blades ready" })
		.click()
	const up = combo(page).getByRole("button", {
		name: "Move marker Hail of Blades ready up",
	})
	await up.focus()
	await page.keyboard.press("Enter")
	await page.keyboard.press("Enter")
	await expect(up).toBeFocused()
	await expect(up).toBeDisabled()
	await expect(damageTotal(page)).not.toHaveText(plain ?? "")
	const empowered = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Remove marker Hail of Blades ready" })
		.click()
	await expect(damageTotal(page)).toHaveText(plain ?? "")
	await combo(page).getByRole("button", { name: "Undo" }).click()
	await expect(damageTotal(page)).toHaveText(empowered ?? "")
	await expect(up).toBeVisible()
})

test("free mode sets an outcome per step, keeps the choice across toggles, and restores the computed one", async ({
	page,
}) => {
	await page.goto("/champions/Quinn?lvl=9&skills=QWEQEQRQE&tab=combo")
	await combo(page).getByRole("button", { name: "Add E, Vault" }).click()
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const strict = await damageTotal(page).textContent()

	const free = combo(page).getByRole("switch", { name: "Free mode" })
	await free.click()
	await expect(damageTotal(page)).toHaveText(strict ?? "")
	const consumed = combo(page).getByRole("button", {
		name: "Harrier: consumes the mark: Yes",
	})
	const kept = combo(page).getByRole("button", {
		name: "Harrier: consumes the mark: No",
	})
	await expect(consumed).toHaveAttribute("aria-pressed", "true")
	await kept.click()
	await expect(kept).toHaveAttribute("aria-pressed", "true")
	await expect(damageTotal(page)).not.toHaveText(strict ?? "")

	await free.click()
	await expect(damageTotal(page)).toHaveText(strict ?? "")
	await free.click()
	await expect(kept).toHaveAttribute("aria-pressed", "true")

	await combo(page).getByRole("button", { name: "Restore computed" }).click()
	await expect(consumed).toHaveAttribute("aria-pressed", "true")
	await expect(damageTotal(page)).toHaveText(strict ?? "")
})

test("Decimate's inner handle deals less than its outer blade, in either mode", async ({
	page,
}) => {
	await page.goto("/champions/Darius?lvl=9&skills=QWEQQRQEQ&tab=combo")
	await combo(page).getByRole("button", { name: "Add Q, Decimate" }).click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const total = async () =>
		Number((await damageTotal(page).textContent())?.replace(/\D/g, ""))
	const blade = await total()

	const lands = combo(page).getByRole("group", { name: "How it lands" })
	await lands.getByRole("button", { name: "Inner handle" }).click()
	await expect.poll(total).toBeLessThan(blade)

	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	await expect(
		lands.getByRole("button", { name: "Inner handle" }),
	).toHaveAttribute("aria-pressed", "true")
	await expect.poll(total).toBeLessThan(blade)
})

test("Hail of Blades again right after its 3 attacks is ignored in strict mode and forced in free mode", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&runes=8100-9923-0-0-0__&tab=combo",
	)
	const ready = combo(page).getByRole("button", {
		name: "Add marker: Hail of Blades ready",
	})
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await ready.click()
	for (let count = 0; count < 4; count++) await attack.click()
	await expect(steps(page)).toHaveCount(4)
	const once = await damageTotal(page).textContent()

	// The second marker goes before the 4th attack, while the rune is on cooldown.
	await ready.click()
	await combo(page)
		.getByRole("button", { name: "Move marker Hail of Blades ready up" })
		.nth(1)
		.click()
	await expect(damageTotal(page)).toHaveText(once ?? "")

	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	await expect(damageTotal(page)).not.toHaveText(once ?? "")
})

test("the combo's time is its last hit, not a buff running on after it", async ({
	page,
}) => {
	await page.goto("/champions/Quinn?lvl=18&skills=QWEQQRQWQWRWWEEREE&tab=combo")
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	for (let count = 0; count < 3; count++) await attack.click()
	const time = combo(page)
		.getByLabel("Combo result")
		.getByRole("definition")
		.nth(2)
	await expect(time).not.toHaveText("0.00 s")
	const plain = await time.textContent()

	// Harrier before the third attack adds Heightened Senses after it: the time stays.
	await combo(page)
		.getByRole("button", { name: "Add marker: Target marked by Harrier" })
		.click()
	const up = combo(page).getByRole("button", {
		name: "Move marker Target marked by Harrier up",
	})
	await up.click()
	await expect(time).toHaveText(plain ?? "")

	// Before the first attack, its attack speed shortens the combo.
	await up.click()
	await up.click()
	await expect(time).not.toHaveText(plain ?? "")
})
