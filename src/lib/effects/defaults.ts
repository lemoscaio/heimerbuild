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
	"on-attack": false,
	"on-cast": false,
	"on-mark-consumed": false,
	periodic: false,
	"on-ability-damage": false,
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
	"on-attack": true,
	"on-cast": true,
	"on-mark-consumed": true,
	periodic: true,
	"on-ability-damage": true,
} as const satisfies Record<TriggerKind, boolean>

export function isSwitchable({ trigger }: Effect): boolean {
	return SWITCHABLE_BY_TRIGGER[trigger.kind]
}

/** Triggers only a combat sequence fires (an attack starting, a cast's mark, a mark consumed, a periodic one, ability damage): no switch in the stats panel. */
const LISTED_BY_TRIGGER = {
	always: true,
	while: true,
	"after-use": true,
	"after-summoner": true,
	"on-hit": true,
	"after-ability": true,
	"on-attack": false,
	"on-cast": false,
	"on-mark-consumed": false,
	periodic: false,
	"on-ability-damage": false,
} as const satisfies Record<TriggerKind, boolean>

/** The stats panel lists the attacker's own effects that a switch can stand in for; the combat simulator reads them all. */
export function isListed({ trigger, holder, listed }: Effect): boolean {
	return (listed ?? LISTED_BY_TRIGGER[trigger.kind]) && holder !== "target"
}
