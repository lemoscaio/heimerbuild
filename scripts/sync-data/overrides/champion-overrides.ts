import { AHRI_ABILITIES } from "../champions/ahri"
import { BELVETH_NO_MANA } from "../champions/belveth"
import { BRIAR_FRENZY_RESOURCE } from "../champions/briar"
import { GAREN_ABILITIES } from "../champions/garen"
import { GNAR_RANGED_ATTACK_TYPE } from "../champions/gnar"
import { KLED_MOUNTED_HEALTH } from "../champions/kled"
import { NASUS_ABILITIES } from "../champions/nasus"
import { REKSAI_FURY_RESOURCE } from "../champions/rek-sai"
import { RENGAR_ABILITIES } from "../champions/rengar"
import { VAYNE_ABILITIES } from "../champions/vayne"
import { VIEGO_NO_MANA } from "../champions/viego"
import { CHAMPION_CAST_TIMES } from "./champion-cast-times"
import { CHAMPION_FORMS } from "./champion-forms"
import { CHAMPION_LEVEL_STATES } from "./champion-level-states"
import { CHAMPION_SKILL_RULES } from "./champion-skill-rules"
import type { ChampionOverride } from "./define-champion-overrides"

/**
 * Fixes for bugs in Riot's champion data (several ability fixes of one champion as one
 * `defineAbilityFixes`), then the level states, forms, skill rules and cast times;
 * see "Data overrides" in the README. One file per champion in `champions/`.
 */
export const CHAMPION_OVERRIDES: readonly ChampionOverride[] = [
	AHRI_ABILITIES,
	BELVETH_NO_MANA,
	BRIAR_FRENZY_RESOURCE,
	GAREN_ABILITIES,
	GNAR_RANGED_ATTACK_TYPE,
	KLED_MOUNTED_HEALTH,
	NASUS_ABILITIES,
	REKSAI_FURY_RESOURCE,
	RENGAR_ABILITIES,
	VAYNE_ABILITIES,
	VIEGO_NO_MANA,
	...CHAMPION_LEVEL_STATES,
	...CHAMPION_FORMS,
	...CHAMPION_SKILL_RULES,
	...CHAMPION_CAST_TIMES,
]
