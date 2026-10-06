import { GNAR_LEVEL_STATES } from "../champions/gnar"
import { KAYLE_LEVEL_STATES } from "../champions/kayle"
import { TRISTANA_LEVEL_STATES } from "../champions/tristana"

/** Stats that change with the level alone; Riot's data has only the level 1 values. One file per champion in `champions/`. */
export const CHAMPION_LEVEL_STATES = [
	GNAR_LEVEL_STATES,
	KAYLE_LEVEL_STATES,
	TRISTANA_LEVEL_STATES,
]
