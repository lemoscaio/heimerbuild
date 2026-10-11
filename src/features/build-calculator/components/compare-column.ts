import { cva } from "class-variance-authority"

/**
 * A form's column while the forms are compared, shared by the header and the rows so they line
 * up: the selected form's reads bolder, colored by how it differs from the other form.
 */
export const compareColumn = cva(
	"w-20 shrink-0 text-right tabular-nums lg:w-16",
	{
		variants: {
			column: {
				compared: "font-normal text-subtle",
				selected: "font-bold text-foreground",
				higher: "font-bold text-success",
				lower: "font-bold text-warning",
			},
		},
	},
)
