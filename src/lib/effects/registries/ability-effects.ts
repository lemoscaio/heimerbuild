import { BELVETH_EFFECTS } from "../../champions/belveth"
import { DR_MUNDO_EFFECTS } from "../../champions/dr-mundo"
import { EZREAL_EFFECTS } from "../../champions/ezreal"
import { GNAR_EFFECTS } from "../../champions/gnar"
import { JANNA_EFFECTS } from "../../champions/janna"
import { JAYCE_EFFECTS } from "../../champions/jayce"
import { JINX_EFFECTS } from "../../champions/jinx"
import { MALPHITE_EFFECTS } from "../../champions/malphite"
import { MORGANA_EFFECTS } from "../../champions/morgana"
import { QUINN_EFFECTS } from "../../champions/quinn"
import { RENGAR_EFFECTS } from "../../champions/rengar"
import { SHYVANA_EFFECTS } from "../../champions/shyvana"
import { SINGED_EFFECTS } from "../../champions/singed"
import { TARIC_EFFECTS } from "../../champions/taric"
import { TEEMO_EFFECTS } from "../../champions/teemo"
import { TRYNDAMERE_EFFECTS } from "../../champions/tryndamere"
import { TWITCH_EFFECTS } from "../../champions/twitch"
import { UDYR_EFFECTS } from "../../champions/udyr"
import { VIEGO_EFFECTS } from "../../champions/viego"
import { ZIGGS_EFFECTS } from "../../champions/ziggs"
import type { Effect } from "../effect"

/**
 * Champions' ability effects, one file per champion in `lib/champions/`; their numbers are the
 * synced rank stats and tooltip lines they read. An `always` one is a passive the champion always
 * has, shown without a switch.
 */
export const ABILITY_EFFECTS: readonly Effect[] = [
	...BELVETH_EFFECTS,
	...DR_MUNDO_EFFECTS,
	...EZREAL_EFFECTS,
	...GNAR_EFFECTS,
	...JANNA_EFFECTS,
	...JAYCE_EFFECTS,
	...JINX_EFFECTS,
	...MALPHITE_EFFECTS,
	...MORGANA_EFFECTS,
	...QUINN_EFFECTS,
	...RENGAR_EFFECTS,
	...SHYVANA_EFFECTS,
	...SINGED_EFFECTS,
	...TARIC_EFFECTS,
	...TEEMO_EFFECTS,
	...TRYNDAMERE_EFFECTS,
	...TWITCH_EFFECTS,
	...UDYR_EFFECTS,
	...VIEGO_EFFECTS,
	...ZIGGS_EFFECTS,
]
