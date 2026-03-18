import { createColumnHelper } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useIsClient } from '~/hooks/useIsClient'
import type { IEquitiesListCompanyRow, IEquitiesListPageProps } from './types'
import { formatCurrency, formatEquitiesDateTime, formatPercent } from './utils'

const columnHelper = createColumnHelper<IEquitiesListCompanyRow>()
const DEFAULT_SORTING_STATE = [{ id: 'marketCap', desc: true }]

const columns = [
	columnHelper.accessor('ticker', {
		header: 'Ticker',
		size: 120,
		cell: ({ row }) => (
			<span className="relative flex items-center gap-2">
				<span className="vf-row-index shrink-0" aria-hidden="true" />
				<BasicLink href={row.original.href} className="font-medium text-(--link-text)">
					{row.original.ticker}
				</BasicLink>
			</span>
		),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('name', {
		header: 'Company',
		size: 200,
		filterFn: (row, _columnId, filterValue) => {
			const query = String(filterValue).trim().toLowerCase()
			if (!query) return true
			return row.original.name.toLowerCase().includes(query) || row.original.ticker.toLowerCase().includes(query)
		},
		cell: ({ getValue, row }) => (
			<BasicLink href={row.original.href} className="text-(--link-text)">
				{getValue()}
			</BasicLink>
		),
		meta: { align: 'start' }
	}),
	columnHelper.accessor('currentPrice', {
		header: 'Price',
		size: 120,
		cell: ({ getValue }) => formatCurrency(getValue()),
		meta: { align: 'end' }
	}),
	columnHelper.accessor('priceChangePercentage', {
		header: '24h Price Change',
		size: 154,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={value == null ? '' : value >= 0 ? 'text-(--success)' : 'text-(--error)'}>
					{formatPercent(value)}
				</span>
			)
		},
		meta: { align: 'end' }
	}),
	columnHelper.accessor('volume', {
		header: 'Volume',
		size: 120,
		cell: ({ getValue }) => formatCurrency(getValue()),
		meta: { align: 'end' }
	}),
	columnHelper.accessor('marketCap', {
		header: 'Market Cap',
		size: 120,
		cell: ({ getValue }) => formatCurrency(getValue()),
		meta: { align: 'end' }
	})
]

function LastUpdated({ value }: { value: string }) {
	const isClient = useIsClient()
	return (
		<p className="shrink-0 text-right text-xs text-(--text-disabled)" suppressHydrationWarning>
			Last updated: {isClient ? formatEquitiesDateTime(value) : value}
		</p>
	)
}

export function EquitiesOverview({ companies, lastUpdatedAt }: IEquitiesListPageProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-1 flex-col gap-1">
						<h1 className="text-xl font-bold">Equities</h1>
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							Track live company rankings by market cap, price, volume, and price change.
						</p>
					</div>
					{lastUpdatedAt ? <LastUpdated value={lastUpdatedAt} /> : null}
				</div>
			</div>

			<TableWithSearch
				data={companies}
				columns={columns}
				placeholder="Search companies or tickers"
				columnToSearch="name"
				header="Company Rankings"
				sortingState={DEFAULT_SORTING_STATE}
				rowSize={56}
				compact
				csvFileName="equities-rankings"
			/>
		</div>
	)
}
