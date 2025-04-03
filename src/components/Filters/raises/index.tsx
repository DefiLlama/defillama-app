import { useMedia } from '~/hooks/useMedia'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search/Raises'
import { NestedMenu } from '~/components/NestedMenu'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div className="flex flex-col gap-4 p-4 rounded-md bg-[var(--bg7)] shadow">
			<h1>{props.header}</h1>
			<RaisesSearch list={props.investors} />

			<div className="flex flex-wrap gap-2 only:*:flex-1">
				{isSmall ? (
					<NestedMenu label="Filters" className="w-full">
						<RaisesFilterDropdowns {...props} nestedMenu />
					</NestedMenu>
				) : (
					<RaisesFilterDropdowns {...props} />
				)}
			</div>
		</div>
	)
}
