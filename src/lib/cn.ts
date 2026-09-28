import { type ClassValue, cn as mergeClasses } from "cn"

/** Joins class names (clsx syntax) and resolves Tailwind conflicts: the last class wins. */
export function cn(...inputs: ClassValue[]) {
	return mergeClasses(...inputs)
}
