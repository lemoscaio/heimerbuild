import { Input } from "@/components/ui/input"

type SearchContainerProps = {
	search: string
	setSearch: (search: string) => void
}

export function SearchContainer(props: SearchContainerProps) {
	const { search, setSearch } = props

	return (
		<Input
			className="h-12 w-full max-w-140 rounded-xl border-primary-2 bg-primary-3 px-4 text-white md:text-base dark:bg-primary-3"
			type="search"
			placeholder="Search a champion"
			aria-label="Search a champion"
			value={search}
			onChange={(e) => setSearch(e.target.value)}
		/>
	)
}
