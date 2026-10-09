import type { ProcView } from "../lib/combat-view"
import { CombatProcCard } from "./combat-proc-card"

/**
 * The separate instances a step triggered (issue 429), as mini cards under its hits: each with its
 * rune or item icon and when it landed. They are no steps: no move or remove of their own.
 */
export function CombatProcs({ procs }: { procs: readonly ProcView[] }) {
	return (
		<ul
			aria-label="Procs"
			className="flex flex-col gap-1 text-[0.6875rem] text-prose"
		>
			{procs.map((proc) => (
				<CombatProcCard key={`${proc.effectId}@${proc.time}`} proc={proc} />
			))}
		</ul>
	)
}
