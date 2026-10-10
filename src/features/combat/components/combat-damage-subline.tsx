import { formatDamage } from "../lib/combat-format"

type CombatDamageSublineProps = {
	raw: number
	/** Its parts after mitigation, when several hits dealt it (`damageParts`). */
	parts?: readonly number[]
}

/** Under a damage number, in both views: its raw damage and its parts: "raw 287", "(60 + 131)". */
export function CombatDamageSubline({
	raw,
	parts = [],
}: CombatDamageSublineProps) {
	return (
		<span className="flex flex-col items-end text-[0.625rem] text-subtle tabular-nums leading-tight">
			<span>raw {formatDamage(raw)}</span>
			{!!parts.length && <span>({parts.map(formatDamage).join(" + ")})</span>}
		</span>
	)
}
