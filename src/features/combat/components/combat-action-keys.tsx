import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type { CombatAction } from "@/lib/combat/combat"
import type { DamageStatus } from "../lib/ability-damage-status"
import type { CombatKey } from "../lib/combat-keys"
import { CombatActionIcon } from "./combat-action-icon"

/** What a key says about its damage when the combo can't count all of it. */
const DAMAGE_NOTES: Partial<Record<DamageStatus, string>> = {
	partial: "Partly modeled",
	"not-modeled": "Not modeled",
}

type CombatActionKeysProps = {
	keys: readonly CombatKey[]
	onAdd: (action: CombatAction) => void
	/** The combo has its most steps: the keys add nothing more. */
	disabled: boolean
}

function keyLabel(key: CombatKey): { short: string; name: string } {
	switch (key.kind) {
		case "attack":
			return { short: "AA", name: "Attack" }
		case "ability":
			return { short: key.slot, name: `${key.slot}, ${key.name}` }
		case "summoner":
			return { short: key.name, name: key.name }
		case "wait":
			return { short: "Wait", name: "Wait 1 second" }
	}
}

function keyIcon(key: CombatKey) {
	return key.kind === "ability" || key.kind === "summoner"
		? { src: key.icon, name: key.name }
		: undefined
}

/** One key per action the combo can add: attack, the form's abilities, the summoner spells, wait. */
export function CombatActionKeys({
	keys,
	onAdd,
	disabled,
}: CombatActionKeysProps) {
	return (
		<ul
			aria-label="Actions"
			className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1"
		>
			{keys.map((key) => {
				const { short, name } = keyLabel(key)
				const note =
					key.kind === "ability" ? DAMAGE_NOTES[key.damage] : undefined
				const unusable = key.kind === "ability" ? key.unusable : undefined
				return (
					<li key={short}>
						<Button
							variant="ghost"
							disabled={disabled}
							onClick={() => onAdd(key.action)}
							aria-label={`Add ${name}`}
							aria-description={[note, unusable].filter(Boolean).join(". ")}
							className="h-auto min-h-11 w-full flex-col gap-1 px-0.5 py-1"
						>
							<CombatActionIcon
								kind={key.kind}
								icon={keyIcon(key)}
								className={cn({ "opacity-50": !!unusable })}
							/>
							<span className="max-w-14 truncate text-[0.6875rem] text-subtle">
								{short}
							</span>
							{note && (
								<span className="text-[0.625rem] text-warning leading-none">
									{note}
								</span>
							)}
						</Button>
					</li>
				)
			})}
		</ul>
	)
}
