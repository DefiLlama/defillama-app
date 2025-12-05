import * as React from 'react'
import { NestedMenu } from '~/components/NestedMenu'
import { RaisesSearch } from '~/containers/Raises/Search'
import { useIsClient } from '~/hooks/useIsClient'
import { useMedia } from '~/hooks/useMedia'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()

	return (
		<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
			<h1 className="text-lg font-semibold">{props.header}</h1>
			<RaisesSearch list={props.investors} />
			<div className="flex min-h-9 flex-wrap gap-2 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<RaisesFilterDropdowns {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden min-h-8 flex-wrap gap-2 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<RaisesFilterDropdowns {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}
