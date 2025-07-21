import { useMedia } from '~/hooks/useMedia'
import { NestedMenu } from '~/components/NestedMenu'
import { PeggedFiltersDropdowns } from './Dropdowns'
import { PeggedSearch } from '~/components/Search/Stablecoins'
import * as React from 'react'
import { useIsClient } from '~/hooks'

export function PeggedFilters(props: { pathname: string; downloadCsv: () => void }) {
	const isSmall = useMedia(`(max-width: 639px)`)
	const isClient = useIsClient()
	return (
		<div className="flex flex-col gap-4 p-3 bg-(--cards-bg) border border-(--cards-border) rounded-md">
			<PeggedSearch variant="secondary" />

			<div className="flex flex-wrap gap-2 min-h-9 *:flex-1 sm:hidden">
				{isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<NestedMenu label="Filters" className="w-full">
							<PeggedFiltersDropdowns {...props} nestedMenu />
						</NestedMenu>
					</React.Suspense>
				) : null}
			</div>
			<div className="hidden flex-wrap gap-2 min-h-8 sm:flex">
				{!isSmall && isClient ? (
					<React.Suspense fallback={<></>}>
						<PeggedFiltersDropdowns {...props} />
					</React.Suspense>
				) : null}
			</div>
		</div>
	)
}
