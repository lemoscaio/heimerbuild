import type { ChampionForm } from "@schemas/champion"
import { useId } from "react"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MOCKUP_BUILD_IDS, type MockupBuildId } from "./lib/mockup-builds"

const BUILD_LABELS: Readonly<Record<MockupBuildId, string>> = {
	jinx: "Jinx",
	lux: "Lux",
	garen: "Garen",
}

type MockupControlsProps = {
	buildId: MockupBuildId
	onBuildChange: (id: MockupBuildId) => void
	forms?: readonly ChampionForm[]
	form?: string
	onFormChange: (form: string) => void
	preview: boolean
	previewItemName?: string
	onPreviewChange: (on: boolean) => void
}

const groupClass =
	"gap-0.5 rounded-lg border border-line bg-surface-sunken p-0.75"
const itemClass =
	"h-auto min-h-9 rounded-md px-3.5 font-semibold text-prose data-pressed:inset-ring-0 data-pressed:bg-lilac data-pressed:text-surface-sunken max-lg:min-h-11"

/** The build, its form and the shop preview every option shows. */
export function MockupControls({
	buildId,
	onBuildChange,
	forms,
	form,
	onFormChange,
	preview,
	previewItemName,
	onPreviewChange,
}: MockupControlsProps) {
	const previewId = useId()

	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
			<ToggleGroup
				aria-label="Build"
				className={groupClass}
				value={[buildId]}
				onValueChange={([next]) => next && onBuildChange(next)}
			>
				{MOCKUP_BUILD_IDS.map((id) => (
					<ToggleGroupItem key={id} value={id} className={itemClass}>
						{BUILD_LABELS[id]}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
			{!!forms?.length && form && (
				<ToggleGroup
					aria-label="Form"
					className={groupClass}
					value={[form]}
					onValueChange={([next]) => next && onFormChange(next)}
				>
					{forms.map(({ id, name }) => (
						<ToggleGroupItem key={id} value={id} className={itemClass}>
							{name}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			)}
			<div className="flex min-h-11 items-center gap-2.5 text-prose text-xs">
				<Switch
					id={previewId}
					checked={preview}
					onCheckedChange={onPreviewChange}
				/>
				<label htmlFor={previewId} className="cursor-pointer">
					Preview {previewItemName ?? "a shop item"} (as hovering it in the
					shop)
				</label>
			</div>
		</div>
	)
}
