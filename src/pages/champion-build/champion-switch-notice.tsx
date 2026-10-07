import { PoliteStatus } from "@/components/common/polite-status"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"
import type {
	ChampionSwitchKept,
	ChampionSwitchReset,
	ChampionSwitchSummary,
} from "./lib/champion-switch"

const KEPT_NAMES: Record<ChampionSwitchKept, string> = {
	items: "items",
	runes: "runes",
	spells: "spells",
}

const RESET_NAMES: Record<ChampionSwitchReset, string> = {
	form: "the form",
	skills: "skill points",
	effects: "effect switches",
	combo: "the combo",
}

/** "a", "a and b", "a, b and c". */
function joinNames(names: readonly string[]) {
	if (names.length < 2) return names.join("")
	return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

/** The notice's lines: the new champion, what was kept (the level always) and what was reset, if anything. */
function noticeLines(
	summary: ChampionSwitchSummary,
	{ championName, level }: { championName: string; level: number },
) {
	const kept = [
		...summary.kept.map((part) => KEPT_NAMES[part]),
		`level ${level}`,
	]
	const resets = summary.resets.map((reset) => RESET_NAMES[reset])
	return {
		title: `Switched to ${championName}`,
		kept: `Kept ${joinNames(kept)}.`,
		reset: resets.length ? `Reset ${joinNames(resets)}.` : undefined,
	}
}

type ChampionSwitchNoticeProps = {
	/** The last switch's outcome; nothing shows without one. */
	summary: ChampionSwitchSummary | undefined
	championName: string
	level: number
	onUndo: () => void
	onDismiss: () => void
} & React.ComponentProps<"div">

/**
 * What the switch to this champion kept and reset, with Undo (the previous link) and Dismiss. Its
 * live region stays mounted, so the switch is announced when the notice appears.
 */
export function ChampionSwitchNotice({
	summary,
	championName,
	level,
	onUndo,
	onDismiss,
	className,
	...props
}: ChampionSwitchNoticeProps) {
	const lines = summary && noticeLines(summary, { championName, level })

	return (
		<>
			<PoliteStatus
				message={
					lines
						? [lines.title, lines.kept, lines.reset].filter(Boolean).join(" ")
						: ""
				}
			/>
			{lines && (
				<div
					className={cn(
						"flex flex-col gap-0.5 rounded-xl border border-kept/50 bg-kept/10 px-3 py-2.5 text-prose text-xs leading-normal",
						className,
					)}
					{...props}
				>
					<p className="font-semibold text-kept">{lines.title}</p>
					<p>{lines.kept}</p>
					{lines.reset && <p className="text-reset">{lines.reset}</p>}
					<div className="mt-1.5 flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="border-kept/50 text-kept max-lg:h-11"
							onClick={onUndo}
						>
							Undo
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="text-subtle max-lg:h-11"
							onClick={onDismiss}
						>
							Dismiss
						</Button>
					</div>
				</div>
			)}
		</>
	)
}
