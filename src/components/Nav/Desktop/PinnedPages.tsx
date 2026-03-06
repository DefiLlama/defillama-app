import * as React from 'react'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { mutatePinnedMetrics } from '../pinnedUtils'
import { LinkToPage } from '../shared'
import type { TNavLink } from '../types'

const ReorderablePinnedPages = React.lazy(() => import('./ReorderablePinnedPages'))

export function PinnedPages({ pinnedPages, asPath }: { pinnedPages: Array<TNavLink>; asPath: string }) {
	const [isReordering, setIsReordering] = React.useState(false)

	React.useEffect(() => {
		if (pinnedPages.length <= 1 && isReordering) {
			setIsReordering(false)
		}
	}, [isReordering, pinnedPages.length])

	return (
		<div className="group/pinned flex flex-col">
			<div
				className="group flex items-center justify-between gap-3 rounded-md pt-1.5 text-xs opacity-65"
				data-reordering={isReordering}
			>
				<span>Pinned Pages</span>
				{pinnedPages.length > 1 ? (
					<button
						type="button"
						className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold tracking-wide text-(--text-tertiary) uppercase hover:bg-black/5 focus-visible:bg-black/5 dark:hover:bg-white/10 dark:focus-visible:bg-white/10 ${
							isReordering ? '' : 'invisible group-focus-within/pinned:visible group-hover/pinned:visible'
						}`}
						onClick={() => setIsReordering((value) => !value)}
					>
						{isReordering ? 'Done' : 'Reorder'}
					</button>
				) : null}
			</div>
			{isReordering ? (
				<>
					<p className="text-[11px] text-(--text-tertiary)">Drag to reorder, click X to unpin</p>
					<React.Suspense fallback={<div className="min-h-[40px]" />}>
						<ReorderablePinnedPages pinnedPages={pinnedPages} />
					</React.Suspense>
				</>
			) : (
				<div className="flex flex-col">
					{pinnedPages.map((page) => (
						<span
							key={`pinned-page-${page.name}-${page.route}`}
							className="group relative flex w-full items-start gap-1"
						>
							<LinkToPage
								route={page.route}
								name={page.name}
								icon={page.icon}
								attention={page.attention}
								asPath={asPath}
							/>
							<Tooltip
								content="Unpin from navigation"
								render={
									<button
										onClick={(e) => {
											e.preventDefault()
											e.stopPropagation()
											mutatePinnedMetrics((routes) => routes.filter((route) => route !== page.route))
										}}
									/>
								}
								className="absolute top-1/2 right-1 hidden -translate-y-1/2 rounded-md bg-(--error) px-1 py-1 text-white group-hover:block"
							>
								<Icon name="x" className="h-4 w-4" />
							</Tooltip>
						</span>
					))}
				</div>
			)}
		</div>
	)
}
