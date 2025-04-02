import { useMedia } from '~/hooks/useMedia'
import { NestedMenu } from '~/components/NestedMenu'
import { PeggedFiltersDropdowns } from './Dropdowns'
import { PeggedSearch } from '~/components/Search/Stablecoins'

export function PeggedFilters(props: { pathname: string; downloadCsv: () => void }) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div className="flex flex-col gap-4 p-4 rounded-md bg-[var(--bg7)] shadow">
			<PeggedSearch variant="secondary" />

			<div className="flex flex-wrap gap-2">
				{isSmall ? (
					<NestedMenu label="Filters" className="w-full">
						<PeggedFiltersDropdowns {...props} nestedMenu />
					</NestedMenu>
				) : (
					<PeggedFiltersDropdowns {...props} />
				)}
			</div>
		</div>
	)
}
