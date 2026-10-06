import { BELVETH_NO_MANA } from "../champions/belveth"
import { BRIAR_FRENZY_RESOURCE } from "../champions/briar"
import { GNAR_RANGED_ATTACK_TYPE } from "../champions/gnar"
import { KLED_MOUNTED_HEALTH } from "../champions/kled"
import { REKSAI_FURY_RESOURCE } from "../champions/rek-sai"
import { VIEGO_NO_MANA } from "../champions/viego"
import { CHAMPION_CAST_TIMES } from "./champion-cast-times"
import { CHAMPION_FORMS } from "./champion-forms"
import { CHAMPION_LEVEL_STATES } from "./champion-level-states"
import { CHAMPION_SKILL_RULES } from "./champion-skill-rules"
import type { ChampionOverride } from "./define-champion-overrides"

/**
 * Fixes for bugs in Riot's champion data, then the level states, forms, skill rules and cast times;
 * see "Data overrides" in the README. One file per champion in `champions/`.
 */
export const CHAMPION_OVERRIDES: readonly ChampionOverride[] = [
	BELVETH_NO_MANA,
	BRIAR_FRENZY_RESOURCE,
	GNAR_RANGED_ATTACK_TYPE,
	KLED_MOUNTED_HEALTH,
	REKSAI_FURY_RESOURCE,
	VIEGO_NO_MANA,
	...CHAMPION_LEVEL_STATES,
	...CHAMPION_FORMS,
	...CHAMPION_SKILL_RULES,
	...CHAMPION_CAST_TIMES,
]
