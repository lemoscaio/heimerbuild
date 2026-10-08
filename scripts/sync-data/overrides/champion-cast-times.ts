import { BRAUM_CAST_TIMES } from "../champions/braum"
import { JANNA_CAST_TIMES } from "../champions/janna"
import { JAX_CAST_TIMES } from "../champions/jax"
import { LEONA_CAST_TIMES } from "../champions/leona"
import { LISSANDRA_CAST_TIMES } from "../champions/lissandra"
import { LUX_CAST_TIMES } from "../champions/lux"
import { MAOKAI_CAST_TIMES } from "../champions/maokai"
import { MORGANA_CAST_TIMES } from "../champions/morgana"
import { NAUTILUS_CAST_TIMES } from "../champions/nautilus"
import { QUINN_CAST_TIMES } from "../champions/quinn"
import { SINGED_CAST_TIMES } from "../champions/singed"
import { TARIC_CAST_TIMES } from "../champions/taric"
import { ZAC_CAST_TIMES } from "../champions/zac"

/**
 * The combo's curated champions whose game files give a cast time the wiki doesn't: the files'
 * `spellCastTime` is the animation's, also set on abilities that cast instantly. One file per
 * champion in `champions/`.
 */
export const CHAMPION_CAST_TIMES = [
	BRAUM_CAST_TIMES,
	JANNA_CAST_TIMES,
	JAX_CAST_TIMES,
	LEONA_CAST_TIMES,
	LISSANDRA_CAST_TIMES,
	LUX_CAST_TIMES,
	MAOKAI_CAST_TIMES,
	MORGANA_CAST_TIMES,
	NAUTILUS_CAST_TIMES,
	QUINN_CAST_TIMES,
	SINGED_CAST_TIMES,
	TARIC_CAST_TIMES,
	ZAC_CAST_TIMES,
]
