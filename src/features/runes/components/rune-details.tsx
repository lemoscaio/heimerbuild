import type { DescribedPerk } from "./rune-row"

type RuneDetailsProps = {
	perk: DescribedPerk | undefined
}

/** What the hovered or focused rune does (the same text screen readers get as its description). */
export function RuneDetails({ perk }: RuneDetailsProps) {
	return (
		<p className="min-h-12 rounded-lg bg-primary-0 px-3 py-2 text-prose text-xs leading-5">
			{perk ? (
				<>
					<b className="font-semibold text-white">{perk.name}</b>
					{!!perk.description && <> · {perk.description}</>}
				</>
			) : (
				<span className="text-subtle">
					Hover, focus or tap a rune to read what it does.
				</span>
			)}
		</p>
	)
}
