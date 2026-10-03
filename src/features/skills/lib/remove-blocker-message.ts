import type { RemoveBlocker } from "./skill-history"

/** Why a point stays, as the order's remove action explains it. */
export function removeBlockerMessage({ level, slot }: RemoveBlocker): string {
	return `The level ${level} ${slot} needs this point. Change or remove level ${level} first.`
}
