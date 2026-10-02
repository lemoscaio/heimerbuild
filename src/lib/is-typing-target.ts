type TypingTarget = Pick<HTMLElement, "tagName" | "isContentEditable">

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

/** Whether a key event's target is a field the user types in, so page shortcuts stay out of its way. */
export function isTypingTarget(target: TypingTarget | null) {
	return (
		!!target && (TYPING_TAGS.has(target.tagName) || target.isContentEditable)
	)
}
