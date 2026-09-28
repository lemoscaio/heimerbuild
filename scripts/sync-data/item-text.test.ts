import { describe, expect, test } from "bun:test"
import { itemMarkupToText } from "./item-text"

describe("itemMarkupToText", () => {
	test.each([
		{
			case: "a stats-only description",
			markup:
				"<mainText><stats><attention>10</attention> Attack Damage</stats><br><br></mainText>",
			text: "",
		},
		{
			case: "a passive after the stats block",
			markup:
				"<mainText><stats><attention>130</attention> Ability Power</stats><br><br><passive>Magical Opus</passive><br>Increases your total <scaleAP>Ability Power by 30%</scaleAP>.</mainText>",
			text: "Magical Opus\nIncreases your total Ability Power by 30%.",
		},
		{
			case: "two passives separated by one blank line",
			markup:
				"<mainText><stats></stats><br><br><passive>Enduring Focus</passive><br>Restore <healing>4 Health</healing> every 5 seconds. <br><br><br><passive>Helping Hand</passive><br>Attacks deal <physicalDamage>5 bonus physical damage</physicalDamage>.</mainText>",
			text: "Enduring Focus\nRestore 4 Health every 5 seconds.\n\nHelping Hand\nAttacks deal 5 bonus physical damage.",
		},
		{
			case: "list items, attributes and extra spaces",
			markup:
				'<rules><font color="#ff0000">Limited</font>   to 1.</rules><li>One<li>Two',
			text: "Limited to 1.\nOne\nTwo",
		},
		{
			case: "entities, decoded as text",
			markup: "Deals &lt;b&gt;bonus&lt;/b&gt; damage &amp; heals",
			text: "Deals <b>bonus</b> damage & heals",
		},
		{
			case: "plain text",
			markup: "Slightly increases Attack Damage",
			text: "Slightly increases Attack Damage",
		},
	])("$case", ({ markup, text }) => {
		expect(itemMarkupToText(markup)).toBe(text)
	})
})
