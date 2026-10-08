import { AKALI_EFFECTS } from "../../champions/akali"
import { BELVETH_EFFECTS } from "../../champions/belveth"
import { BLITZCRANK_EFFECTS } from "../../champions/blitzcrank"
import { BRAND_EFFECTS } from "../../champions/brand"
import { CAMILLE_EFFECTS } from "../../champions/camille"
import { CHOGATH_EFFECTS } from "../../champions/chogath"
import { DR_MUNDO_EFFECTS } from "../../champions/dr-mundo"
import { DRAVEN_EFFECTS } from "../../champions/draven"
import { EZREAL_EFFECTS } from "../../champions/ezreal"
import { FIORA_EFFECTS } from "../../champions/fiora"
import { GAREN_EFFECTS } from "../../champions/garen"
import { GNAR_EFFECTS } from "../../champions/gnar"
import { JANNA_EFFECTS } from "../../champions/janna"
import { JAX_EFFECTS } from "../../champions/jax"
import { JAYCE_EFFECTS } from "../../champions/jayce"
import { JINX_EFFECTS } from "../../champions/jinx"
import { KATARINA_EFFECTS } from "../../champions/katarina"
import { KENNEN_EFFECTS } from "../../champions/kennen"
import { MALPHITE_EFFECTS } from "../../champions/malphite"
import { MASTER_YI_EFFECTS } from "../../champions/master-yi"
import { MISS_FORTUNE_EFFECTS } from "../../champions/miss-fortune"
import { MONKEY_KING_EFFECTS } from "../../champions/monkey-king"
import { MORGANA_EFFECTS } from "../../champions/morgana"
import { NASUS_EFFECTS } from "../../champions/nasus"
import { OLAF_EFFECTS } from "../../champions/olaf"
import { QUINN_EFFECTS } from "../../champions/quinn"
import { RENGAR_EFFECTS } from "../../champions/rengar"
import { SAMIRA_EFFECTS } from "../../champions/samira"
import { SENNA_EFFECTS } from "../../champions/senna"
import { SHYVANA_EFFECTS } from "../../champions/shyvana"
import { SINGED_EFFECTS } from "../../champions/singed"
import { SION_EFFECTS } from "../../champions/sion"
import { SIVIR_EFFECTS } from "../../champions/sivir"
import { SWAIN_EFFECTS } from "../../champions/swain"
import { TALON_EFFECTS } from "../../champions/talon"
import { TARIC_EFFECTS } from "../../champions/taric"
import { TEEMO_EFFECTS } from "../../champions/teemo"
import { THRESH_EFFECTS } from "../../champions/thresh"
import { TRISTANA_EFFECTS } from "../../champions/tristana"
import { TRUNDLE_EFFECTS } from "../../champions/trundle"
import { TRYNDAMERE_EFFECTS } from "../../champions/tryndamere"
import { TWITCH_EFFECTS } from "../../champions/twitch"
import { UDYR_EFFECTS } from "../../champions/udyr"
import { VEIGAR_EFFECTS } from "../../champions/veigar"
import { VI_EFFECTS } from "../../champions/vi"
import { VIEGO_EFFECTS } from "../../champions/viego"
import { WARWICK_EFFECTS } from "../../champions/warwick"
import { XIN_ZHAO_EFFECTS } from "../../champions/xin-zhao"
import { ZIGGS_EFFECTS } from "../../champions/ziggs"
import type { Effect } from "../effect"

/**
 * Champions' ability effects, one file per champion in `lib/champions/`; their numbers are the
 * synced rank stats and tooltip lines they read. An `always` one is a passive the champion always
 * has, shown without a switch.
 */
export const ABILITY_EFFECTS: readonly Effect[] = [
	...AKALI_EFFECTS,
	...BELVETH_EFFECTS,
	...BLITZCRANK_EFFECTS,
	...BRAND_EFFECTS,
	...CAMILLE_EFFECTS,
	...CHOGATH_EFFECTS,
	...DR_MUNDO_EFFECTS,
	...DRAVEN_EFFECTS,
	...EZREAL_EFFECTS,
	...FIORA_EFFECTS,
	...GAREN_EFFECTS,
	...GNAR_EFFECTS,
	...JANNA_EFFECTS,
	...JAX_EFFECTS,
	...JAYCE_EFFECTS,
	...JINX_EFFECTS,
	...KATARINA_EFFECTS,
	...KENNEN_EFFECTS,
	...MALPHITE_EFFECTS,
	...MASTER_YI_EFFECTS,
	...MISS_FORTUNE_EFFECTS,
	...MONKEY_KING_EFFECTS,
	...OLAF_EFFECTS,
	...MORGANA_EFFECTS,
	...NASUS_EFFECTS,
	...QUINN_EFFECTS,
	...RENGAR_EFFECTS,
	...SAMIRA_EFFECTS,
	...SENNA_EFFECTS,
	...SHYVANA_EFFECTS,
	...SINGED_EFFECTS,
	...SION_EFFECTS,
	...SIVIR_EFFECTS,
	...SWAIN_EFFECTS,
	...TALON_EFFECTS,
	...TARIC_EFFECTS,
	...TEEMO_EFFECTS,
	...THRESH_EFFECTS,
	...TRISTANA_EFFECTS,
	...TRUNDLE_EFFECTS,
	...TRYNDAMERE_EFFECTS,
	...TWITCH_EFFECTS,
	...UDYR_EFFECTS,
	...VEIGAR_EFFECTS,
	...VI_EFFECTS,
	...VIEGO_EFFECTS,
	...WARWICK_EFFECTS,
	...XIN_ZHAO_EFFECTS,
	...ZIGGS_EFFECTS,
]
