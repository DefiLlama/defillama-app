import { useMedia } from '~/hooks/useMedia'
import { SlidingMenu } from '~/components/SlidingMenu'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search/Raises'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 30rem)`)

	return (
		<div>
			<div className="relative flex items-center gap-2 flex-wrap p-4 rounded-t-md bg-white dark:bg-black">
				<h1>{props.header}</h1>
			</div>
			<div className="flex flex-col gap-4 p-4 rounded-b-md bg-white dark:bg-black">
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
		</div>
	)
}
