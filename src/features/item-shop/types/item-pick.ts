/** How the shop picks items: a click selects one, a double click or Enter on the selected one adds it. */
export type ItemPickProps = {
	selectedItemId: string | undefined
	onItemSelect: (itemId: string) => void
	onItemAdd: (itemId: string) => void
}
