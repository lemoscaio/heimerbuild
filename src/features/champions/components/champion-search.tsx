import { Input } from "@/components/ui/input"

type ChampionSearchProps = {
	search: string
	onSearchChange: (search: string) => void
}

export function ChampionSearch({
	search,
	onSearchChange,
}: ChampionSearchProps) {
	return (
		<Input
			className="h-12 w-full max-w-140 rounded-xl bg-surface px-4 text-white md:text-base"
			type="search"
			placeholder="Search a champion"
			aria-label="Search a champion"
			value={search}
			onChange={(event) => onSearchChange(event.target.value)}
		/>
	)
}
