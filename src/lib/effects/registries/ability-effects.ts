import type { Amount, Effect } from "../effect"

const MOVE_QUICK =
	"https://wiki.leagueoflegends.com/en-us/Template:Data_Teemo/Move_Quick"
const MOVE_QUICK_SPEED: Amount = {
	by: "rank",
	rankStat: "movementSpeedPercent",
}

/** Champions' conditional ability effects; their numbers are the synced rank stats they read. */
export const ABILITY_EFFECTS: readonly Effect[] = [
	{
		id: "teemo-w-passive",
		source: { kind: "ability", championKey: "Teemo", slot: "W" },
		trigger: { kind: "while", condition: "not-damaged-recently" },
		endsOn: "damage-taken",
		grants: [
			{ kind: "stat", stat: "movementSpeedPercent", amount: MOVE_QUICK_SPEED },
		],
		sourceUrl: MOVE_QUICK,
	},
	{
		id: "teemo-w-active",
		source: { kind: "ability", championKey: "Teemo", slot: "W" },
		trigger: { kind: "after-use" },
		duration: 3,
		replaces: ["teemo-w-passive"],
		grants: [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { ...MOVE_QUICK_SPEED, scale: 2 },
			},
		],
		sourceUrl: MOVE_QUICK,
	},
]
