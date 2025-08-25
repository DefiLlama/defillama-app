import * as React from 'react'
import { NestedMenu } from '~/components/NestedMenu'
import { useIsClient } from '~/hooks'
import { useMedia } from '~/hooks/useMedia'
import { PeggedFiltersDropdowns } from './Dropdowns'

export function PeggedFilters(props: {
	pathname: string
	prepareCsv: () => { filename: string; rows: Array<Array<string | number | boolean>> }
}) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()
	return (
		<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-1">
			<div className="flex min-h-[30px] flex-wrap gap-2 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<PeggedFiltersDropdowns {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden min-h-[30px] flex-wrap gap-2 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<PeggedFiltersDropdowns {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}
