import { Input } from "@/components/ui/input"

type SearchContainerProps = {
	search: string
	setSearch: (search: string) => void
}

export function SearchContainer(props: SearchContainerProps) {
	const { search, setSearch } = props

	return (
		<div className="flex justify-center py-8">
			<Input
				className="h-12 w-7/10 max-w-150 rounded-2xl border-none bg-primary-2 px-5 text-white md:text-base dark:bg-primary-2"
				type="search"
				placeholder="Search a champion"
				aria-label="Search a champion"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>
		</div>
	)
}
