import { Collapse } from "@/components/motion/collapse"
import { Stagger } from "@/components/motion/stagger"
import { ChampionGrid } from "./champion-grid"

// Only the first rows animate in; the rest ride the list's fade, which keeps 170+ cards cheap.
const REVEALED_CARDS = 24

type ChampionListRevealProps = Omit<
	React.ComponentProps<typeof Collapse>,
	"render"
>

/** The home's champion list region, opened and closed by its toggle. */
export function ChampionListReveal(props: ChampionListRevealProps) {
	return <Collapse render={<section />} {...props} />
}

/** The champion grid, staggering its first cards in when the list opens. */
export function ChampionGridReveal({ children }: React.PropsWithChildren) {
	return <Stagger render={<ChampionGrid />}>{children}</Stagger>
}

type ChampionCardRevealProps = React.PropsWithChildren<{
	/** Position in the grid: only the first rows stagger. */
	index: number
}>

/** One champion card's entrance; the wrapper div is a plain grid cell. */
export function ChampionCardReveal({
	index,
	children,
}: ChampionCardRevealProps) {
	if (index >= REVEALED_CARDS) return children
	return <Stagger.Item className="min-w-0">{children}</Stagger.Item>
}
