import type { SummonerSpell } from "@schemas/summoner-spell"
import { useId } from "react"
import { GameIcon } from "@/components/common/game-icon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type {
	SpellRuneEffect,
	SpellRuneEffectsById,
} from "@/lib/summoner-rune-interactions"
import type { SummonerSlot } from "@/lib/summoner-slots"
import { useSpellGrid } from "../hooks/use-spell-grid"
import type { Summoners } from "../hooks/use-summoners"

const GRID_COLUMNS = 3

type OptionStatus = "selected" | "other-slot" | "free"

/** Picking the spell of the other slot swaps the two, so the grid says so. */
function optionStatus(
	spell: SummonerSpell,
	slots: { selected?: SummonerSpell; other?: SummonerSpell },
): OptionStatus {
	if (spell.id === slots.selected?.id) return "selected"
	if (spell.id === slots.other?.id) return "other-slot"
	return "free"
}

const STATUS_NOTES = { selected: "Selected", "other-slot": "Swaps slots" }

type SummonerSpellPickerProps = {
	/** The popup's title element (a popover or sheet title naming the slot). */
	title: React.ReactNode
	slot: SummonerSlot
	summoners: Summoners
	/** Each spell's reacting runes in the current page. */
	spellEffects: SpellRuneEffectsById
	onPick: (spellId: string) => void
	onClear: () => void
}

/**
 * The picker's content: the Summoner's Rift spells in a grid, what the hovered or focused one
 * does (with the runes of the page that react to it), and Clear.
 */
export function SummonerSpellPicker({
	title,
	slot,
	summoners,
	spellEffects,
	onPick,
	onClear,
}: SummonerSpellPickerProps) {
	const selected = summoners.slots[slot]
	const other = summoners.slots[slot === 0 ? 1 : 0]
	const grid = useSpellGrid({
		spells: summoners.available,
		selectedId: selected?.id,
		columns: GRID_COLUMNS,
	})
	const described = grid.active ?? selected

	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex items-baseline justify-between gap-2">
				{title}
				<span className="text-[11px] text-subtle">Summoner's Rift</span>
			</div>
			<div
				role="listbox"
				aria-label="Summoner spells"
				tabIndex={-1}
				className="grid grid-cols-3 gap-1.5"
				onKeyDown={grid.onKeyDown}
			>
				{summoners.available.map((spell) => (
					<SpellOption
						key={spell.id}
						spell={spell}
						status={optionStatus(spell, { selected, other })}
						isTabStop={spell.id === grid.tabStopId}
						runeMarks={(spellEffects.get(spell.id) ?? []).filter(
							(effect) => effect.isSpellSpecific,
						)}
						onPick={onPick}
						onDescribe={grid.describe}
					/>
				))}
			</div>
			<SpellEffects
				spell={described}
				effects={described ? (spellEffects.get(described.id) ?? []) : []}
			/>
			<div className="flex items-center justify-between gap-2">
				<p className="text-[11px] text-subtle max-lg:invisible">
					Arrows move · Enter picks · Esc closes
				</p>
				<Button
					variant="ghost"
					size="sm"
					className="text-lilac max-lg:h-11"
					disabled={!selected}
					onClick={onClear}
				>
					Clear
				</Button>
			</div>
		</div>
	)
}

type SpellOptionProps = {
	spell: SummonerSpell
	status: OptionStatus
	isTabStop: boolean
	/** Runes of the page made for this spell (Hextech Flashtraption for Flash). */
	runeMarks: readonly SpellRuneEffect[]
	onPick: (spellId: string) => void
	onDescribe: (spell: SummonerSpell) => void
}

function SpellOption({
	spell,
	status,
	isTabStop,
	runeMarks,
	onPick,
	onDescribe,
}: SpellOptionProps) {
	const noteId = useId()

	return (
		<button
			type="button"
			role="option"
			aria-selected={status === "selected"}
			aria-describedby={noteId}
			tabIndex={isTabStop ? 0 : -1}
			className="relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-line bg-surface-sunken px-1 pt-1.5 pb-1 outline-none transition hover:border-line-strong focus-visible:border-lilac focus-visible:ring-2 focus-visible:ring-lilac aria-selected:border-lilac aria-selected:bg-lilac/15"
			onClick={() => onPick(spell.id)}
			onFocus={() => onDescribe(spell)}
			onPointerEnter={() => onDescribe(spell)}
		>
			<GameIcon
				src={spell.icon}
				name={spell.name}
				className="size-9 rounded-md"
			/>
			{!!runeMarks.length && (
				<span
					aria-hidden="true"
					className="absolute top-1 right-1 flex gap-0.5"
				>
					{runeMarks.map(({ rune }) => (
						<GameIcon
							key={rune.id}
							src={rune.icon}
							name={rune.name}
							className="size-4 rounded-full border border-gold bg-surface-sunken"
						/>
					))}
				</span>
			)}
			<span className="font-semibold text-[11px] text-white">{spell.name}</span>
			<span
				id={noteId}
				className={cn("text-[10px] text-subtle", {
					"text-lilac": status === "selected",
					"text-gold": status === "other-slot",
				})}
			>
				{status === "free" ? `${spell.cooldown} s` : STATUS_NOTES[status]}
			</span>
		</button>
	)
}

type SpellEffectsProps = {
	spell: SummonerSpell | undefined
	effects: readonly SpellRuneEffect[]
}

/** What the described spell does, then each rune of the page that reacts to it. */
function SpellEffects({ spell, effects }: SpellEffectsProps) {
	return (
		<div
			aria-live="polite"
			className="flex min-h-16 flex-col gap-1.5 rounded-lg border border-gold/30 bg-surface-sunken px-2.5 py-2 text-prose text-xs leading-snug"
		>
			{spell ? (
				<>
					<p>
						<span className="font-semibold text-white">{spell.name}</span>
						<span aria-hidden="true"> · </span>
						{spell.description}
					</p>
					{effects.map(({ rune, text }) => (
						<p key={rune.id} className="flex items-start gap-1.5">
							<GameIcon
								src={rune.icon}
								name={rune.name}
								className="mt-px size-4 rounded-full bg-surface-sunken"
							/>
							<span>
								<span className="font-semibold text-white">{rune.name}</span> in
								your runes: {text}
							</span>
						</p>
					))}
				</>
			) : (
				<p className="self-center text-subtle">
					Hover or focus a spell to read what it does.
				</p>
			)}
		</div>
	)
}
