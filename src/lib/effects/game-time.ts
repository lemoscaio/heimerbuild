import type { Amount, Effect, GameTimeAmount } from "./effect"

/** The game time condition, in whole minutes; absent means the start of the game. */
export const GAME_START = 0
/** Only guards typos: a game has no practical upper bound. */
export const MAX_GAME_TIME = 120

/** A typed or stepped game time as whole minutes, 0 to 120. */
export function clampGameTime(minutes: number): number {
	return Math.min(MAX_GAME_TIME, Math.max(GAME_START, Math.round(minutes)))
}

function isGameTimeAmount(amount: Amount): amount is GameTimeAmount {
	return typeof amount === "object" && amount.by === "gameTime"
}

function gameTimeAmounts({ grants }: Effect): GameTimeAmount[] {
	return grants.flatMap((grant) =>
		"amount" in grant && isGameTimeAmount(grant.amount) ? [grant.amount] : [],
	)
}

/** Whether the effect's value depends on the game time (Gathering Storm). */
export function readsGameTime(effect: Effect): boolean {
	return gameTimeAmounts(effect).length > 0
}

/** The full `every`-minute steps reached at `minutes`: 2 at 20 to 29 min for a 10-minute step. */
export function gameTimeSteps(every: number, minutes: number): number {
	return Math.floor(minutes / every)
}

/** The total of `steps` steps of a triangular growth: 1, 3, 6, 10… times the step. */
export function triangularSteps(steps: number): number {
	return (steps * (steps + 1)) / 2
}

/** The minute the effect's value next changes after `minutes`, or none when it does not read the game time. */
export function nextGameTimeStep(
	effect: Effect,
	minutes: number,
): number | undefined {
	const changes = gameTimeAmounts(effect).map(
		({ every }) => (gameTimeSteps(every, minutes) + 1) * every,
	)
	return changes.length ? Math.min(...changes) : undefined
}
