import { useMedia } from '~/hooks/useMedia'
import { SlidingMenu } from '~/components/SlidingMenu'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search/Raises'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div className="flex flex-col gap-4 p-4 rounded-md bg-[var(--bg7)] shadow">
			<h1>{props.header}</h1>
			<RaisesSearch list={props.investors || []} />

			<div className="flex flex-wrap gap-2 only:*:flex-1">
				{isSmall ? (
					<SlidingMenu label="Filters" variant="secondary">
						<RaisesFilterDropdowns {...props} isMobile />
					</SlidingMenu>
				) : (
					<RaisesFilterDropdowns {...props} />
				)}
			</div>
		</div>
	)
}
