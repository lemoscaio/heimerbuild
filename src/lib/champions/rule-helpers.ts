import type { RankValueAmount } from "../effects/effect"

/** The wiki's ability data pages: `${WIKI}Teemo/Move_Quick`. */
export const WIKI = "https://wiki.leagueoflegends.com/en-us/Template:Data_"

/** A percent tooltip line of the ability, as a fraction: "Armor" 10 to 30 (%) is 0.1 to 0.3. */
export function percentLine(label: string): RankValueAmount {
	return { by: "rankValue", label, scale: 0.01 }
}
