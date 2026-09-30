import { describe, expect, test } from "bun:test"
import { runeMarkupToRichText } from "./rune-text"

describe("runeMarkupToRichText", () => {
	test("splits paragraphs on blank lines and lines on single breaks", () => {
		expect(
			runeMarkupToRichText(
				"Deals damage.<br><br>Damage: 70 - 240<br>Cooldown: 20s",
			),
		).toEqual([
			[[{ text: "Deals damage." }]],
			[[{ text: "Damage: 70 - 240" }], [{ text: "Cooldown: 20s" }]],
		])
	})

	test("keeps bold and italic and drops every other tag with its attributes", () => {
		expect(
			runeMarkupToRichText(
				"Hit 3 <b>separate</b> times for <lol-uikit-tooltipped-keyword key='X'><font color='#48C4B7'>adaptive damage</font></lol-uikit-tooltipped-keyword>. <i>'Thunder.'</i>",
			),
		).toEqual([
			[
				[
					{ text: "Hit 3 " },
					{ text: "separate", strong: true },
					{ text: " times for adaptive damage. " },
					{ text: "'Thunder.'", italic: true },
				],
			],
		])
	})

	test("treats a rules block as italic, even around nested italics", () => {
		expect(
			runeMarkupToRichText(
				"<rules><i>Ranged:</i> 40% effective.</rules> Done.",
			),
		).toEqual([
			[[{ text: "Ranged: 40% effective.", italic: true }, { text: " Done." }]],
		])
	})

	test("turns list items into bulleted lines", () => {
		expect(
			runeMarkupToRichText("Your next attack will:<li>Deal damage<li>Heal you"),
		).toEqual([
			[
				[{ text: "Your next attack will:" }],
				[{ text: "• Deal damage" }],
				[{ text: "• Heal you" }],
			],
		])
	})

	test("collapses whitespace and runs of breaks, and trims every line", () => {
		expect(
			runeMarkupToRichText(
				"<br>  First,  <b> bold </b>  end. <br><br><hr><br><rules><br>Rule.<br></rules><br>",
			),
		).toEqual([
			[
				[
					{ text: "First, " },
					{ text: "bold ", strong: true },
					{ text: "end." },
				],
			],
			[[{ text: "Rule.", italic: true }]],
		])
	})

	test("decodes entities as plain text and drops unknown tags such as script", () => {
		const text = runeMarkupToRichText(
			"&lt;img src=x onerror=alert(1)&gt; a < b <script>bad()</script> &amp; ok",
		)
		expect(text).toEqual([
			[[{ text: "<img src=x onerror=alert(1)> a < b bad() & ok" }]],
		])
	})
})
