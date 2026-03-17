import { createColumnHelper } from '@tanstack/react-table'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import type { ColumnOrdersByBreakpoint, ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { formattedNum } from '~/utils'
import type { IEquitiesListCompanyRow, IEquitiesListPageProps } from './types'
import { formatEquitiesDateTime } from './utils'

const columnHelper = createColumnHelper<IEquitiesListCompanyRow>()
const DEFAULT_SORTING_STATE = [{ id: 'marketCap', desc: true }]

function formatCurrency(value: number | null): string {
	return value == null ? '-' : (formattedNum(value, true) ?? '-')
}

function formatDollarAmount(value: number | null): string {
	return value == null ? '-' : (formattedNum(value, true) ?? '-')
}

function formatPercent(value: number | null): string {
	return value == null ? '-' : `${formattedNum(value, false) ?? '0'}%`
}

const columns = [
	columnHelper.accessor('ticker', {
		header: 'Ticker',
		size: 136,
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
		size: 420,
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
		size: 164,
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
		header: '24h Volume',
		size: 128,
		cell: ({ getValue }) => formatDollarAmount(getValue()),
		meta: { align: 'end' }
	}),
	columnHelper.accessor('marketCap', {
		header: 'Market Cap',
		size: 152,
		cell: ({ getValue }) => formatCurrency(getValue()),
		meta: { align: 'end' }
	}),
	columnHelper.accessor('lastUpdatedAt', {
		header: 'Updated',
		size: 228,
		enableSorting: false,
		cell: ({ getValue }) => formatEquitiesDateTime(getValue()),
		meta: { align: 'end' }
	})
]

const columnSizes: ColumnSizesByBreakpoint = {
	0: {
		ticker: 132,
		name: 240,
		currentPrice: 120,
		priceChangePercentage: 164,
		volume: 116,
		marketCap: 140,
		lastUpdatedAt: 188
	},
	640: {
		ticker: 144,
		name: 340,
		currentPrice: 124,
		priceChangePercentage: 164,
		volume: 124,
		marketCap: 152,
		lastUpdatedAt: 220
	},
	1024: {
		ticker: 136,
		name: 380,
		currentPrice: 124,
		priceChangePercentage: 164,
		volume: 132,
		marketCap: 156,
		lastUpdatedAt: 236
	},
	1536: {
		ticker: 136,
		name: 420,
		currentPrice: 128,
		priceChangePercentage: 168,
		volume: 136,
		marketCap: 160,
		lastUpdatedAt: 244
	}
}

const columnOrders: ColumnOrdersByBreakpoint = {
	0: ['ticker', 'name', 'currentPrice', 'priceChangePercentage', 'marketCap', 'volume', 'lastUpdatedAt'],
	640: ['ticker', 'name', 'currentPrice', 'priceChangePercentage', 'volume', 'marketCap', 'lastUpdatedAt']
}

export function EquitiesOverview({ companies, lastUpdatedAt }: IEquitiesListPageProps) {
	return (
		<div className="flex flex-col gap-2">
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-1 flex-col gap-1">
						<h1 className="text-xl font-bold">Equities</h1>
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							Track live company rankings by market cap, price, 24h volume, and price change.
						</p>
					</div>
					{lastUpdatedAt ? (
						<p className="shrink-0 text-right text-xs text-(--text-disabled)">
							Last updated: {formatEquitiesDateTime(lastUpdatedAt)}
						</p>
					) : null}
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
				columnSizes={columnSizes}
				columnOrders={columnOrders}
				csvFileName="equities-rankings"
			/>
		</div>
	)
}
