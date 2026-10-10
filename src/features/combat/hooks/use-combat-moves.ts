import type { ActionNames } from "../lib/combat-action-names"
import { actionLabel } from "../lib/combat-format"
import type {
	CombatGroupItem,
	CombatListItem,
	CombatShownItem,
} from "./use-combat-view"
import { useStepReorder } from "./use-step-reorder"

type UseCombatMovesOptions = {
	/** The entries in the combo's order. */
	list: readonly CombatListItem[]
	/** The entries as shown, with their groups. */
	items: readonly CombatShownItem[]
	names: ActionNames
	/** Moves the entries `ids`, kept together, to position `to`. */
	onMove: (ids: readonly number[], to: number) => void
}

function groupsOf(items: readonly CombatShownItem[]) {
	return items.filter((item): item is CombatGroupItem => item.kind === "group")
}

/** The combo's blocks in its order: an entry, or a whole group's steps (they follow one another there). */
function comboBlocks(
	list: readonly CombatListItem[],
	groups: readonly CombatGroupItem[],
) {
	return list.flatMap(({ id }) => {
		const group = groups.find(({ steps }) =>
			steps.some((step) => step.id === id),
		)
		if (!group) return [[id]]
		return group.steps[0]?.id === id ? [group.steps.map((step) => step.id)] : []
	})
}

/** What a screen reader hears after a move: the entry, and its new place in the combo or in its group. */
function moveDescriber(
	list: readonly CombatListItem[],
	groups: readonly CombatGroupItem[],
	names: ActionNames,
) {
	return (ids: readonly number[], { at, of }: { at: number; of: number }) => {
		const [id] = ids
		const group = groups.find(({ steps }) => steps[0]?.id === id)
		if (group && ids.length > 1) {
			// Its step numbers change with the move: name it by its action.
			return `Group ${actionLabel(group.action, names)} ×${group.steps.length} is now item ${at + 1} of ${of}`
		}
		const item = list.find((entry) => entry.id === id)
		if (item?.kind === "marker") {
			return `Marker ${item.view.label} is now item ${at + 1} of ${of}`
		}
		const inGroup = groups.some(({ steps }) =>
			steps.some((step) => step.id === id),
		)
		const label = item ? actionLabel(item.action, names) : "The step"
		return inGroup
			? `${label} is now step ${at + 1} of ${of} in its group`
			: `${label} is now item ${at + 1} of ${of}`
	}
}

/**
 * The moves of the combo's entries, whatever their order on screen: a step or a marker moves one
 * entry of the combo (so it can go inside a run), a group past its whole neighbour, a step inside an
 * open group among its steps, and a marker to the start (issue 344).
 */
export function useCombatMoves({
	list,
	items,
	names,
	onMove,
}: UseCombatMovesOptions) {
	const entryIds = list.map(({ id }) => id)
	const groups = groupsOf(items)
	const blocks = comboBlocks(list, groups)
	const entries = entryIds.map((id) => [id])
	const blockOf = (id: number) =>
		blocks.findIndex((block) => block.includes(id))
	const reorder = useStepReorder({
		entryIds,
		onMove,
		describeMove: moveDescriber(list, groups, names),
	})

	return {
		/** A step's or a marker's up and down moves. */
		entry: (id: number) => reorder.moves(entries, entryIds.indexOf(id)),
		/** A marker's move to the start of the combo. */
		toStart: (id: number) => reorder.toStart(blocks, blockOf(id)),
		group: (group: CombatGroupItem) => reorder.moves(blocks, blockOf(group.id)),
		/** A step's moves among its open group's steps. */
		inGroup: (group: CombatGroupItem, id: number) =>
			reorder.moves(
				group.steps.map((step) => [step.id]),
				group.steps.findIndex((step) => step.id === id),
			),
		/** The last move, said politely. */
		announcement: reorder.announcement,
	}
}
