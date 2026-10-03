import type { Effect, TriggerKind } from "./effect"

/**
 * States the champion holds by default are on (the stats panel shows a champion at rest);
 * effects that follow an action are off until the user turns them on.
 */
const ON_BY_TRIGGER = {
	always: true,
	while: true,
	"after-use": false,
	"after-summoner": false,
	"on-hit": false,
	"after-ability": false,
} as const satisfies Record<TriggerKind, boolean>

export function isOnByDefault({ trigger, defaultOn }: Effect): boolean {
	return defaultOn ?? ON_BY_TRIGGER[trigger.kind]
}

/** An `always` effect is a fact of the build: its row in the Effects list informs, with no switch. */
const SWITCHABLE_BY_TRIGGER = {
	always: false,
	while: true,
	"after-use": true,
	"after-summoner": true,
	"on-hit": true,
	"after-ability": true,
} as const satisfies Record<TriggerKind, boolean>

export function isSwitchable({ trigger }: Effect): boolean {
	return SWITCHABLE_BY_TRIGGER[trigger.kind]
}
