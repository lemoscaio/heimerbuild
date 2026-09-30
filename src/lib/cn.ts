import type { ClassValue } from "cn"
import { createCn } from "cn/engine"
import tables from "./cn-tables"

// Fitted to the class groups used in src/ by the cn plugin in vite.config.ts.
const mergeClasses = createCn(tables)

/** Joins class names (clsx syntax) and resolves Tailwind conflicts: the last class wins. */
export function cn(...inputs: ClassValue[]) {
	return mergeClasses(...inputs)
}
