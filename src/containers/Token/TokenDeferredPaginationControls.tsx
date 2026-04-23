import { Icon } from '~/components/Icon'
import { LoadingSpinner } from '~/components/Loaders'
import { DEFAULT_TABLE_PAGE_SIZE } from './tableUtils'

export function TokenDeferredPaginationControls({
	totalCount,
	isLoading,
	onRequestPage
}: {
	totalCount: number
	isLoading?: boolean
	onRequestPage: (pageIndex: number) => void
}) {
	const pageCount = Math.max(1, Math.ceil(totalCount / DEFAULT_TABLE_PAGE_SIZE))

	if (pageCount <= 1) return null

	return (
		<div className="flex flex-wrap items-center justify-between gap-2">
			<div className="flex items-center gap-2">
				<button
					type="button"
					aria-label="Go to first page"
					disabled
					className="rounded-md border border-(--cards-border) p-2 text-sm opacity-50"
				>
					<Icon name="chevrons-left" height={16} width={16} />
				</button>
				<button
					type="button"
					aria-label="Go to previous page"
					disabled
					className="rounded-md border border-(--cards-border) p-2 text-sm opacity-50"
				>
					<Icon name="chevron-left" height={16} width={16} />
				</button>
				<span className="text-xs text-(--text-secondary)">{`Page 1 of ${pageCount}`}</span>
				<button
					type="button"
					aria-label="Go to next page"
					onClick={() => onRequestPage(1)}
					disabled={isLoading}
					className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name="chevron-right" height={16} width={16} />
				</button>
				<button
					type="button"
					aria-label="Go to last page"
					onClick={() => onRequestPage(pageCount - 1)}
					disabled={isLoading}
					className="rounded-md border border-(--cards-border) p-2 text-sm transition-colors hover:bg-(--cards-bg) disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name="chevrons-right" height={16} width={16} />
				</button>
			</div>
			{isLoading ? (
				<div className="flex items-center gap-2 text-xs text-(--text-secondary)">
					<LoadingSpinner size={12} />
					<span>Loading full table...</span>
				</div>
			) : null}
		</div>
	)
}
