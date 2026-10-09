import { createContext, use } from "react"

/** Option 4 animates its values, bars and breakdowns; Options 1 to 3 stay as they were. */
export type MockupMotion = "static" | "animated"

const MockupMotionContext = createContext<MockupMotion | null>(null)

export function useMockupMotion(): MockupMotion {
	const motion = use(MockupMotionContext)
	if (!motion) {
		throw new Error("useMockupMotion must be used within MockupMotionProvider")
	}
	return motion
}

export function MockupMotionProvider({
	value,
	children,
}: React.PropsWithChildren<{ value: MockupMotion }>) {
	return <MockupMotionContext value={value}>{children}</MockupMotionContext>
}
