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

/** What the combo shows, to compare two pages: its result, steps, inputs, mode, answers and target. */
async function comboSnapshot(page: Page) {
	const pressed = combo(page).getByRole("button", { pressed: true })
	return {
		result: await combo(page)
			.getByRole("group", { name: "Combo result" })
			.textContent(),
		steps: await combo(page).getByRole("listitem").allTextContents(),
		pressed: await pressed.evaluateAll((buttons) =>
			buttons.map((button) => button.getAttribute("aria-label") ?? ""),
		),
		free: await combo(page)
			.getByRole("switch", { name: "Free mode" })
			.getAttribute("aria-checked"),
		health: await combo(page)
			.getByRole("textbox", { name: "Target health" })
			.inputValue(),
	}
}

test("Quinn's combo adds steps, moves one up with its button, removes one, and keeps them in the link", async ({
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
	await expect(page).toHaveURL(/[?&]combo=aa\.e(&|$)/)

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

test("Harrier's marker moves and is removed like a step, with Undo", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&tab=combo",
	)
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await attack.click()
	await attack.click()
	await expect(damageTotal(page)).not.toHaveText("0")
	const plain = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Add marker: Target marked by Harrier" })
		.click()
	const up = combo(page).getByRole("button", {
		name: "Move marker Target marked by Harrier up",
	})
	await up.focus()
	await page.keyboard.press("Enter")
	await page.keyboard.press("Enter")
	await expect(up).toBeFocused()
	await expect(up).toBeDisabled()
	await expect(damageTotal(page)).not.toHaveText(plain ?? "")
	const empowered = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Remove marker Target marked by Harrier" })
		.click()
	await expect(damageTotal(page)).toHaveText(plain ?? "")
	await combo(page).getByRole("button", { name: "Undo" }).click()
	await expect(damageTotal(page)).toHaveText(empowered ?? "")
	await expect(up).toBeVisible()
})

test("a marker goes at the start of a built combo from its chip's menu, or to the start from its own button, and stays first in the link", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&tab=combo",
	)
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await attack.click()
	await attack.click()
	await attack.click()
	await expect(groups(page)).toHaveCount(1)
	await expect(damageTotal(page)).not.toHaveText("0")
	const plain = await damageTotal(page).textContent()

	// From the keyboard: the chip's arrow opens where the marker can go.
	const where = combo(page).getByRole("button", {
		name: "Where to put marker: Target marked by Harrier",
	})
	const atStart = page.getByRole("menuitem", { name: "Add at the start" })
	await where.focus()
	await page.keyboard.press("Enter")
	await atStart.focus()
	await page.keyboard.press("Enter")
	const up = combo(page).getByRole("button", {
		name: "Move marker Target marked by Harrier up",
	})
	await expect(up).toBeDisabled()
	// It sits before the group, which stays whole, and first in the link.
	await expect(groups(page)).toHaveCount(1)
	await expect(damageTotal(page)).not.toHaveText(plain ?? "")
	await expect(page).toHaveURL(
		/[?&]combo=m-quinn-harrier-valor\.aa\.aa\.aa(&|$)/,
	)
	const empowered = await damageTotal(page).textContent()

	await combo(page).getByRole("button", { name: "Undo" }).click()
	await expect(damageTotal(page)).toHaveText(plain ?? "")
	await expect(up).toHaveCount(0)
	await expect(page).toHaveURL(/[?&]combo=aa\.aa\.aa(&|$)/)

	// Added at the start again, it stays first through a reload.
	await where.click()
	await atStart.click()
	await page.reload()
	await expect(up).toBeDisabled()
	await expect(damageTotal(page)).toHaveText(empowered ?? "")
	await combo(page)
		.getByRole("button", { name: "Remove marker Target marked by Harrier" })
		.click()
	await expect(up).toHaveCount(0)

	// Added at the end, it changes nothing until it goes to the start in one move.
	await combo(page)
		.getByRole("button", { name: "Add marker: Target marked by Harrier" })
		.click()
	await expect(damageTotal(page)).toHaveText(plain ?? "")
	const toStart = combo(page).getByRole("button", {
		name: "Move marker Target marked by Harrier to the start",
	})
	await toStart.focus()
	await page.keyboard.press("Enter")
	await expect(toStart).toBeFocused()
	await expect(toStart).toBeDisabled()
	await expect(up).toBeDisabled()
	await expect(damageTotal(page)).toHaveText(empowered ?? "")
	await expect(page).toHaveURL(
		/[?&]combo=m-quinn-harrier-valor\.aa\.aa\.aa(&|$)/,
	)
	await page.reload()
	await expect(toStart).toBeDisabled()
	await expect(damageTotal(page)).toHaveText(empowered ?? "")
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

test("Poison Trail deals less and ends sooner the shorter Singed's target stays in the trail, and the link keeps the time", async ({
	page,
}) => {
	await page.goto("/champions/Singed?lvl=9&skills=QWEQQRQEQ&tab=combo&combo=q")
	const inTrail = combo(page).getByRole("textbox", {
		name: "Time in the trail in seconds",
	})
	// A link without a time is the full one (issue 427).
	await expect(inTrail).toHaveValue("4")
	await expect(damageTotal(page)).not.toHaveText("0")
	const total = async () =>
		Number((await damageTotal(page).textContent())?.replace(/\D/g, ""))
	const time = comboTotal(page, "Time")
	const full = await total()
	const fullTime = await time.textContent()

	await inTrail.fill("2")
	await inTrail.press("Enter")
	await expect.poll(total).toBeLessThan(full)
	await expect(time).not.toHaveText(fullTime ?? "")
	await expect(page).toHaveURL(/[?&]combo=q-2s(&|$)/)

	await combo(page)
		.getByRole("button", { name: "Increase Time in the trail in seconds" })
		.click()
	await expect(inTrail).toHaveValue("2.25")
	await expect(page).toHaveURL(/[?&]combo=q-2_25s(&|$)/)
})

test("Harrier's mark again while Valor is on cooldown is ignored in strict mode and forced in free mode", async ({
	page,
}) => {
	await page.goto(
		"/champions/Quinn?lvl=9&items=1036,1036,1036&skills=QWEQEQRQE&tab=combo",
	)
	const marked = combo(page).getByRole("button", {
		name: "Add marker: Target marked by Harrier",
	})
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await marked.click()
	for (let count = 0; count < 4; count++) await attack.click()
	// Four identical attacks in a row show as one group.
	await expect(groups(page)).toHaveCount(1)
	const once = await damageTotal(page).textContent()

	// The second marker goes before the 4th attack, while Valor is on cooldown.
	await marked.click()
	await combo(page)
		.getByRole("button", { name: "Move marker Target marked by Harrier up" })
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

test("a combo with a variant, a wait, free mode's answers, a start cooldown and a target opens the same after a reload and from its copied link", async ({
	page,
	context,
}) => {
	await context.grantPermissions(["clipboard-read", "clipboard-write"])
	await page.goto(
		"/champions/Darius?lvl=9&skills=QWEQQRQEQ&runes=8100-9923-0-0-0__&tab=combo",
	)
	const attack = combo(page).getByRole("button", { name: "Add Attack" })
	await attack.click()
	await attack.click()
	await combo(page).getByRole("button", { name: "Add Q, Decimate" }).click()
	await combo(page)
		.getByRole("button", { name: /^Add Wait/ })
		.click()
	await expect(steps(page)).toHaveCount(4)

	await combo(page)
		.getByRole("group", { name: "How it lands" })
		.getByRole("button", { name: "Inner handle" })
		.click()
	const wait = combo(page).getByRole("textbox", { name: "Wait in seconds" })
	await wait.fill("1.5")
	await wait.press("Enter")
	const health = combo(page).getByRole("textbox", { name: "Target health" })
	await health.fill("2500")
	await health.press("Enter")
	await combo(page).getByRole("switch", { name: "Free mode" }).click()
	const firstAttack = combo(page)
		.getByRole("listitem")
		.filter({
			has: page.getByRole("button", { name: "Remove step 1. Attack" }),
		})
	await firstAttack.getByRole("button", { name: "Hail of Blades: No" }).click()
	await expect(page).toHaveURL(/[?&]choices=/)
	await expect(page).toHaveURL(/[?&]target=2500-60-45\b/)
	await combo(page)
		.getByRole("button", { name: "Start on cooldown: Hail of Blades ready" })
		.click()
	await expect(page).toHaveURL(/[?&]start=-hail-of-blades\b/)
	await expect(damageTotal(page)).not.toHaveText("0")
	const built = await comboSnapshot(page)

	await page.reload()
	await expect(steps(page)).toHaveCount(4)
	expect(await comboSnapshot(page)).toEqual(built)

	await page.getByRole("button", { name: "Copy link" }).first().click()
	const link = await page.evaluate(() => navigator.clipboard.readText())
	const opened = await context.newPage()
	await opened.goto(link)
	await expect(opened).toHaveURL(/[?&]tab=combo\b/)
	await expect(steps(opened)).toHaveCount(4)
	expect(await comboSnapshot(opened)).toEqual(built)
})

test("Master Yi's Highlander before his attacks speeds them up, so the combo ends sooner", async ({
	page,
}) => {
	const seconds = async () =>
		Number.parseFloat((await comboTotal(page, "Time").textContent()) ?? "")
	await page.goto(
		"/champions/MasterYi?lvl=11&skills=QEQWQRQEQER&tab=combo&combo=aa.aa.aa.aa",
	)
	// Four identical attacks show as one group.
	await expect(groups(page)).toHaveCount(1)
	await expect.poll(seconds).toBeGreaterThan(0)
	const plain = await seconds()

	await page.goto(
		"/champions/MasterYi?lvl=11&skills=QEQWQRQEQER&tab=combo&combo=r.aa.aa.aa.aa",
	)
	await expect(steps(page)).toHaveCount(1)
	await expect.poll(seconds).toBeLessThan(plain)
})

test("Viego's attack pauses part of Harrowed Path for a moment, and a cast pauses it again", async ({
	page,
}) => {
	await page.goto(
		"/champions/Viego?lvl=6&skills=QEWQQR&tab=combo&combo=e.aa.t1.q",
	)
	const running = combo(page).getByRole("list", { name: "Effects running" })
	// One list per step: the E cast, the attack, the 1 s wait, the Q cast.
	await expect(running).toHaveCount(4)
	const afterCast = await running.nth(0).textContent()

	await expect(running.nth(1)).not.toHaveText(afterCast ?? "")
	await expect(running.nth(2)).toHaveText(afterCast ?? "")
	await expect(running.nth(3)).not.toHaveText(afterCast ?? "")
})

test("Twitch's Ambush gives its attack speed only once an attack breaks the camouflage, which starts 1 s after the cast", async ({
	page,
}) => {
	await page.goto("/champions/Twitch?lvl=3&skills=QWE&tab=combo&combo=q.t1.aa")
	const running = combo(page).getByRole("list", { name: "Effects running" })
	// The cast (camouflage ahead), the 1 s wait (camouflaged), the attack that breaks it.
	await expect(running).toHaveCount(3)
	const ahead = (await running.nth(0).textContent()) ?? ""
	const camouflaged = (await running.nth(1).textContent()) ?? ""
	expect(camouflaged).not.toBe(ahead)
	await expect(running.nth(2)).not.toHaveText(camouflaged)

	// Waiting less than the delay, the attack starts before the camouflage and doesn't break it:
	// the camouflage begins during its windup and is still on after it lands.
	await page.goto(
		"/champions/Twitch?lvl=3&skills=QWE&tab=combo&combo=q.t0_5.aa",
	)
	await expect(running).toHaveCount(3)
	await expect(running.nth(1)).toHaveText(ahead)
	await expect(running.nth(2)).toHaveText(camouflaged)
})

test("Black Cleaver lowers the target's armor for the hits after each attack, and Rengar's leap does after its own hit", async ({
	page,
}) => {
	await page.goto("/champions/Darius?lvl=9&items=3071&tab=combo&combo=aa.t1.aa")
	const resists = combo(page).getByRole("list", { name: "Target resistances" })
	const hits = combo(page).getByRole("list", { name: "Hits" })
	// Every step after the first attack: the attack, the wait, the second attack.
	await expect(resists).toHaveCount(3)
	await expect(hits).toHaveCount(2)
	// The same attack deals more on the armor the first one carved.
	await expect(hits.nth(1)).not.toHaveText(
		(await hits.nth(0).textContent()) ?? "",
	)

	await page.goto("/champions/Rengar?lvl=6&skills=QWEQQR&tab=combo&combo=r.aa")
	await expect(steps(page)).toHaveCount(2)
	// Nothing while camouflaged; the leap reduces the armor after it lands.
	await expect(resists).toHaveCount(1)
})

test("a cooldown started on cooldown leaves the link with its item: no orphan in the Combo start", async ({
	page,
}) => {
	await page.goto(
		"/champions/Annie?lvl=9&skills=QWEQQRQEQ&items=3057&tab=combo&combo=q&start=-sheen-spellblade",
	)
	const addBack = combo(page).getByRole("button", {
		name: "Add to the combo start",
	})
	await expect(addBack).toBeVisible()

	await page.getByRole("button", { name: "Remove Sheen" }).first().click()
	await expect(addBack).toHaveCount(0)
	await combo(page).getByRole("button", { name: "Add Attack" }).click()
	await expect(page).toHaveURL(/[?&]combo=q\.aa(&|$)/)
	await expect(page).not.toHaveURL(/[?&]start=/)
})

test("the combo starts with Conqueror stacked from +, kept in the link", async ({
	page,
}) => {
	await page.goto(
		"/champions/Garen?lvl=9&skills=QWEQQRQEQ&runes=8000-8010-0-0-0__&tab=combo&combo=q.e.r",
	)
	await expect(steps(page)).toHaveCount(3)
	const before = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Add to the combo start" })
		.click()
	await page.getByRole("menuitem", { name: "Conqueror 12/12" }).click()
	await expect(page).toHaveURL(/[?&]start=conqueror-12\b/)
	await expect(damageTotal(page)).not.toHaveText(before ?? "")
	const stacked = await damageTotal(page).textContent()

	await combo(page)
		.getByRole("button", { name: "Conqueror stacks at the start: 12 of 12" })
		.click()
	await page
		.getByRole("button", { name: "Decrease Conqueror stacks at the start" })
		.click()
	await expect(page).toHaveURL(/[?&]start=conqueror-11\b/)
	await page.keyboard.press("Escape")

	await page.reload()
	await expect(
		combo(page).getByRole("button", {
			name: "Conqueror stacks at the start: 11 of 12",
		}),
	).toBeVisible()
	await expect(damageTotal(page)).not.toHaveText(stacked ?? "")

	await combo(page)
		.getByRole("button", { name: "Remove from the start: Conqueror stacks" })
		.click()
	await expect(page).not.toHaveURL(/[?&]start=/)
	await expect(damageTotal(page)).toHaveText(before ?? "")
})
