import { useRef, useState } from "react"

type UseStepReorderOptions = {
	/** The steps' ids, in order. */
	ids: readonly number[]
	onMove: (id: number, to: number) => void
	/** What a screen reader hears after a move: "Q, Blinding Assault is now step 2 of 5". */
	describeMove: (id: number, to: number) => string
}

type Drag = { id: number; to: number }

/** `ids` with `id` at position `to`. */
function reordered(ids: readonly number[], { id, to }: Drag): number[] {
	const rest = ids.filter((entry) => entry !== id)
	return [...rest.slice(0, to), id, ...rest.slice(to)]
}

/** The position the pointer is over: before the first step whose middle is below it. */
function positionAt(list: HTMLElement, id: number, clientY: number): number {
	const others = [
		...list.querySelectorAll<HTMLElement>("[data-step-id]"),
	].filter((item) => item.dataset.stepId !== String(id))
	const index = others.findIndex((item) => {
		const { top, height } = item.getBoundingClientRect()
		return clientY < top + height / 2
	})
	return index === -1 ? others.length : index
}

/**
 * Reorders the combo's steps from a handle: dragged with a mouse, a pen or a finger (the list
 * shows the new order while dragging), or moved one place with the arrow keys.
 */
export function useStepReorder({
	ids,
	onMove,
	describeMove,
}: UseStepReorderOptions) {
	const listRef = useRef<HTMLOListElement>(null)
	const [drag, setDrag] = useState<Drag>()
	const [announcement, setAnnouncement] = useState("")

	function move(id: number, to: number) {
		onMove(id, to)
		setAnnouncement(describeMove(id, to))
	}

	function handleProps(id: number) {
		const index = ids.indexOf(id)
		return {
			onPointerDown(event: React.PointerEvent<HTMLElement>) {
				if (event.button !== 0) return
				event.currentTarget.setPointerCapture(event.pointerId)
				setDrag({ id, to: index })
			},
			onPointerMove(event: React.PointerEvent<HTMLElement>) {
				if (drag?.id !== id || !listRef.current) return
				const to = positionAt(listRef.current, id, event.clientY)
				if (to !== drag.to) setDrag({ id, to })
			},
			onPointerUp() {
				if (drag?.id === id && drag.to !== index) move(id, drag.to)
				setDrag(undefined)
			},
			onPointerCancel: () => setDrag(undefined),
			onKeyDown(event: React.KeyboardEvent<HTMLElement>) {
				const step = { ArrowUp: -1, ArrowDown: 1 }[event.key]
				if (step === undefined) return
				event.preventDefault()
				const to = index + step
				if (to >= 0 && to < ids.length) move(id, to)
			},
		}
	}

	return {
		listRef,
		/** The ids in the order to show: the new one while a step is dragged. */
		order: drag ? reordered(ids, drag) : [...ids],
		draggedId: drag?.id,
		handleProps,
		/** The last move, said politely. */
		announcement,
	}
}
