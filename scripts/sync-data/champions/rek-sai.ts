// Rek'Sai: her bar is Fury, not the RAGE Riot's data names.
import { defineChampionOverride } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const REKSAI_FURY_RESOURCE = defineChampionOverride({
	id: "reksai-fury-resource",
	championKey: "RekSai",
	field: "resource",
	since: "16.19",
	reason: "Riot's data names Rek'Sai's resource RAGE; her bar is Fury",
	source: `${WIKI}Rek%27Sai`,
	apply: () => "FURY",
})
