import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer"
import { NumberField } from "@/components/ui/number-field"
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import type { CombatStartChip } from "../lib/combat-start"

type StackChip = Extract<CombatStartChip, { kind: "stacks" }>

type CombatStartStackChipProps = {
	chip: StackChip
	onCountChange: (count: number) => void
	onRemove: () => void
}

type StackEditorProps = Pick<
	CombatStartStackChipProps,
	"chip" | "onCountChange"
>

/** The count from 1 to the cap, with Max. */
function StackEditor({ chip, onCountChange }: StackEditorProps) {
	const { name, count, max } = chip
	return (
		<div className="flex items-center gap-2">
			<NumberField
				label={`${name} stacks at the start`}
				min={1}
				max={max}
				value={count}
				onValueChange={(next) => {
					if (next !== null) onCountChange(next)
				}}
				className="max-lg:[&_button]:size-11 max-lg:[&_input]:h-11"
			/>
			<span aria-hidden="true" className="text-subtle text-xs">
				of {max}
			</span>
			<Button
				variant="outline"
				size="xs"
				disabled={count === max}
				onClick={() => onCountChange(max)}
				className="max-lg:h-11"
			>
				Max
			</Button>
		</div>
	)
}

const EDITOR_NOTE = "It runs its full duration from the start."

/**
 * A stacking effect the combo starts with ("Conqueror 12/12 ×"): its count opens the editor, a
 * popover on desktop and a bottom sheet on phones.
 */
export function CombatStartStackChip({
	chip,
	onCountChange,
	onRemove,
}: CombatStartStackChipProps) {
	const isDesktop = useIsDesktop()
	const { id, name, count, max } = chip
	const trigger = (
		<Button
			variant="ghost"
			size="xs"
			data-start-chip={id}
			aria-label={`${name} stacks at the start: ${count} of ${max}`}
			className="rounded-full px-1.5 font-semibold text-gold tabular-nums max-lg:h-11"
		/>
	)
	const title = `${name} at the start`

	return (
		<li className="flex items-center gap-0.5 rounded-full border border-lilac/60 bg-surface-raised py-0.5 pr-0.5 pl-2.5 text-xs">
			{name}
			{isDesktop ? (
				<Popover>
					<PopoverTrigger render={trigger}>
						{count}/{max}
					</PopoverTrigger>
					<PopoverContent align="start" className="w-auto gap-2">
						<PopoverTitle>{title}</PopoverTitle>
						<StackEditor chip={chip} onCountChange={onCountChange} />
						<p className="text-subtle">{EDITOR_NOTE}</p>
					</PopoverContent>
				</Popover>
			) : (
				<Drawer>
					<DrawerTrigger render={trigger}>
						{count}/{max}
					</DrawerTrigger>
					<DrawerContent className="flex flex-col gap-3">
						<DrawerTitle>{title}</DrawerTitle>
						<StackEditor chip={chip} onCountChange={onCountChange} />
						<p className="text-subtle text-xs">{EDITOR_NOTE}</p>
					</DrawerContent>
				</Drawer>
			)}
			<Button
				variant="ghost"
				size="icon-xs"
				aria-label={`Remove from the start: ${name} stacks`}
				onClick={onRemove}
				className="rounded-full max-lg:size-11"
			>
				<X aria-hidden="true" />
			</Button>
		</li>
	)
}
