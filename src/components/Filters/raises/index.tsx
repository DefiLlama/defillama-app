import { useMedia } from '~/hooks/useMedia'
import { RaisesFilterDropdowns } from './Dropdowns'
import { IDropdownMenusProps } from './types'
import { RaisesSearch } from '~/components/Search/Raises'
import { NestedMenu } from '~/components/NestedMenu'
import * as React from 'react'
import { useIsClient } from '~/hooks'

export function RaisesFilters(props: IDropdownMenusProps) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()

	return (
		<div className="flex flex-col gap-4 p-3 rounded-md bg-[var(--cards-bg)]">
			<h1 className="text-lg font-semibold">{props.header}</h1>
			<RaisesSearch list={props.investors} />

			<div className="flex flex-wrap gap-2 min-h-9 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<RaisesFilterDropdowns {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden flex-wrap gap-2 min-h-8 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<RaisesFilterDropdowns {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}
