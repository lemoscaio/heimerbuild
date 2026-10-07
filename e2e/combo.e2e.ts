import { expect, type Page } from "@playwright/test"
import { test } from "./fixtures"

function combo(page: Page) {
	return page.getByRole("region", { name: "Combo" })
}

/** One remove button per step card. */
function steps(page: Page) {
	return combo(page).getByRole("button", { name: /^Remove step / })
}

/** A figure of the combo's result by its name: "Damage", "Time". */
function comboTotal(page: Page, term: string) {
	return combo(page)
		.getByRole("group", { name: "Combo result" })
		.getByRole("group", { name: term, exact: true })
		.getByRole("definition")
}

/** One remove button per group of identical steps. */
function groups(page: Page) {
	return combo(page).getByRole("button", { name: /^Remove group / })
}

function damageTotal(page: Page) {
	return comboTotal(page, "Damage")
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
	// Four identical attacks in a row show as one group.
	await expect(groups(page)).toHaveCount(1)
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
	const time = comboTotal(page, "Time")
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

test("Teemo's attacks apply Toxic Shot: one line on the attack that applied it, its ticks listed on demand", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9&skills=EQWEERE&tab=combo")
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await attack.click()
	await attack.click()
	await expect(steps(page)).toHaveCount(2)

	// The poison is a side effect of the attack, not a step of its own.
	const first = combo(page)
		.getByRole("listitem")
		.filter({
			has: page.getByRole("button", { name: "Remove step 1. Attack" }),
		})
	await expect(
		first.getByRole("list", { name: "Damage over time" }).getByRole("listitem"),
	).toHaveCount(1)
	const expand = first.getByRole("button", { name: "Toxic Shot ticks" })
	await expect(expand).toHaveAttribute("aria-expanded", "false")
	await expand.click()
	await expect(expand).toHaveAttribute("aria-expanded", "true")
	// Rank 4 at 1 s apart over 4 s: the first attack owns all 4, the second only adds later ones.
	await expect(
		first.getByRole("list", { name: "Toxic Shot ticks" }).getByRole("listitem"),
	).toHaveCount(4)

	// Free mode makes each application an answer: no poison, less damage.
	const strict = await damageTotal(page).textContent()
	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	await first.getByRole("button", { name: "Toxic Shot: applies: No" }).click()
	await expect(damageTotal(page)).not.toHaveText(strict ?? "")
})

test("the damage splits by type: Teemo's attack is physical and magic, Ignite adds true, and the parts add up to the total", async ({
	page,
}) => {
	const byType = () =>
		combo(page)
			.getByRole("list", { name: "Damage by type" })
			.getByRole("listitem")
	const amount = (text: string) =>
		Number(/^[\d,]+/.exec(text.trim())?.[0].replace(/,/g, "") ?? Number.NaN)

	// Without Toxic Shot, an attack is physical only: the other types don't show.
	await page.goto("/champions/Teemo?lvl=9&skills=QWQ&tab=combo")
	await expect(byType()).toHaveCount(0)
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(byType()).toHaveCount(1)

	await page.goto(
		"/champions/Teemo?lvl=9&skills=EQWEERE&summoners=4,14&tab=combo",
	)
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(byType()).toHaveCount(2)
	await combo(page).getByRole("button", { name: "Add Ignite" }).click()
	await expect(byType()).toHaveCount(3)

	const total = amount((await damageTotal(page).textContent()) ?? "")
	const parts = (await byType().allTextContents()).map(amount)
	const sum = parts.reduce((a, b) => a + b, 0)
	// Each amount is rounded on its own.
	expect(Math.abs(sum - total)).toBeLessThanOrEqual(parts.length)

	// Free mode's choices reach it: no poison, less magic damage.
	const magic = await byType().nth(1).textContent()
	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	await combo(page)
		.getByRole("button", { name: "Toxic Shot: applies: No" })
		.click()
	await expect(byType().nth(1)).not.toHaveText(magic ?? "")
})

test("a 12-attack Teemo combo collapses into one group, opens on demand, moves as a whole and loses a step from inside", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9&skills=EQWEERE&tab=combo")
	await combo(page)
		.getByRole("button", { name: "Add Q, Blinding Dart" })
		.click()
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	for (let count = 0; count < 12; count++) await attack.click()

	// Collapsed: only the dart's own card has step controls.
	await expect(groups(page)).toHaveCount(1)
	await expect(steps(page)).toHaveCount(1)

	// The group moves past the dart as a whole and keeps the focus.
	const groupUp = combo(page).getByRole("button", {
		name: /^Move group .* up$/,
	})
	await groupUp.click()
	await expect(groupUp).toBeFocused()
	await expect(groupUp).toBeDisabled()
	await expect(
		combo(page).getByRole("button", { name: /^Move step 13, Q · .* down$/ }),
	).toBeDisabled()

	const toggle = combo(page).getByRole("button", {
		name: /^Show steps of group/,
	})
	await expect(toggle).toHaveAttribute("aria-expanded", "false")
	await toggle.press("Enter")
	const hide = combo(page).getByRole("button", { name: /^Hide steps of group/ })
	await expect(hide).toHaveAttribute("aria-expanded", "true")
	await expect(steps(page)).toHaveCount(13)

	// Inside, a step moves only among the group's steps.
	await expect(
		combo(page).getByRole("button", { name: "Move step 1, Attack up" }),
	).toBeDisabled()
	await combo(page)
		.getByRole("button", { name: "Remove step 5. Attack" })
		.click()
	await expect(steps(page)).toHaveCount(12)
	await expect(hide).toHaveAttribute("aria-expanded", "true")

	// Collapsing doesn't change the result, and × on the group removes all of its steps.
	const afterRemove = await damageTotal(page).textContent()
	await hide.click()
	await expect(steps(page)).toHaveCount(1)
	await expect(damageTotal(page)).toHaveText(afterRemove ?? "")
	await combo(page)
		.getByRole("button", { name: /^Remove group / })
		.click()
	await expect(groups(page)).toHaveCount(0)
	await expect(steps(page)).toHaveCount(1)
})

test("in free mode a collapsed group has no answers; open, each of its steps is answered on its own", async ({
	page,
}) => {
	await page.goto("/champions/Teemo?lvl=9&skills=EQWEERE&tab=combo")
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	for (let count = 0; count < 3; count++) await attack.click()
	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	const strict = await damageTotal(page).textContent()

	const noPoison = combo(page).getByRole("button", {
		name: "Toxic Shot: applies: No",
	})
	await expect(noPoison).toHaveCount(0)
	await combo(page)
		.getByRole("button", { name: /^Show steps of group/ })
		.click()
	await expect(noPoison).toHaveCount(3)
	await noPoison.first().click()
	await expect(noPoison.first()).toHaveAttribute("aria-pressed", "true")
	await expect(noPoison.nth(1)).toHaveAttribute("aria-pressed", "false")
	await expect(damageTotal(page)).not.toHaveText(strict ?? "")
})
