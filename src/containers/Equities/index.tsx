import { createColumnHelper, type SortingState, type VisibilityState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import { startTransition, useMemo } from 'react'
import { BasicLink } from '~/components/Link'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { useIsClient } from '~/hooks/useIsClient'
import defs from '~/public/equities-definitions.json'
import { abbreviateNumber } from '~/utils'
import { pushShallowQuery, readSingleQueryValue } from '~/utils/routerQuery'
import type { IEquitiesListCompanyRow, IEquitiesListPageProps } from './types'
import { formatEquitiesDateTime } from './utils'

const columnHelper = createColumnHelper<IEquitiesListCompanyRow>()

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
		header: defs.currentPrice.label,
		size: 120,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.currentPrice.description }
	}),
	columnHelper.accessor('priceChangePercentage1d', {
		header: defs.priceChangePercentage1d.label,
		size: 148,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={value >= 0 ? 'text-(--success)' : 'text-(--error)'}>{abbreviateNumber(value, 2, '%')}</span>
			)
		},
		meta: { align: 'end', headerHelperText: defs.priceChangePercentage1d.description }
	}),
	columnHelper.accessor('priceChangePercentage7d', {
		header: defs.priceChangePercentage7d.label,
		size: 148,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={value >= 0 ? 'text-(--success)' : 'text-(--error)'}>{abbreviateNumber(value, 2, '%')}</span>
			)
		},
		meta: { align: 'end', headerHelperText: defs.priceChangePercentage7d.description }
	}),
	columnHelper.accessor('priceChangePercentage1m', {
		header: defs.priceChangePercentage1m.label,
		size: 148,
		cell: ({ getValue }) => {
			const value = getValue()
			return (
				<span className={value >= 0 ? 'text-(--success)' : 'text-(--error)'}>{abbreviateNumber(value, 2, '%')}</span>
			)
		},
		meta: { align: 'end', headerHelperText: defs.priceChangePercentage1m.description }
	}),
	columnHelper.accessor('volume', {
		header: defs.volume.label,
		size: 120,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2),
		meta: { align: 'end', headerHelperText: defs.volume.description }
	}),
	columnHelper.accessor('marketCap', {
		header: defs.marketCap.label,
		size: 120,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.marketCap.description }
	}),
	columnHelper.accessor('trailingPE', {
		header: defs.trailingPE.label,
		size: 80,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2),
		meta: { align: 'end', headerHelperText: defs.trailingPE.description }
	}),
	columnHelper.accessor('dividendYield', {
		header: defs.dividendYield.label,
		size: 100,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '%'),
		meta: { align: 'end', headerHelperText: defs.dividendYield.description }
	}),
	columnHelper.accessor('priceToBook', {
		header: defs.priceToBook.label,
		size: 72,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2),
		meta: { align: 'end', headerHelperText: defs.priceToBook.description }
	}),
	columnHelper.accessor('operatingProfitMargin', {
		header: defs.operatingProfitMargin.label,
		size: 110,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '%'),
		meta: { align: 'end', headerHelperText: defs.operatingProfitMargin.description }
	}),
	columnHelper.accessor('revenueTTM', {
		header: defs.revenueTTM.label,
		size: 140,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.revenueTTM.description }
	}),
	columnHelper.accessor('grossProfitTTM', {
		header: defs.grossProfitTTM.label,
		size: 160,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.grossProfitTTM.description }
	}),
	columnHelper.accessor('earningsTTM', {
		header: defs.earningsTTM.label,
		size: 140,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.earningsTTM.description }
	}),
	columnHelper.accessor('totalAssets', {
		header: defs.totalAssets.label,
		size: 120,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.totalAssets.description }
	}),
	columnHelper.accessor('totalLiabilities', {
		header: defs.totalLiabilities.label,
		size: 132,
		cell: ({ getValue }) => abbreviateNumber(getValue(), 2, '$'),
		meta: { align: 'end', headerHelperText: defs.totalLiabilities.description }
	})
]

// ── Column Presets (URL-driven) ──────────────────────────────────────────────

const EQUITIES_PRESETS = [
	'Market Cap',
	'Earnings',
	'Revenue',
	'P/E ratio',
	'Dividend %',
	'Operating Margin',
	'Total assets',
	'Total liabilities',
	'Price to Book'
] as const

type EquitiesPreset = (typeof EQUITIES_PRESETS)[number]

const PRESET_QUERY_SLUGS: Record<EquitiesPreset, string | undefined> = {
	'Market Cap': undefined,
	Earnings: 'earnings',
	Revenue: 'revenue',
	'P/E ratio': 'pe-ratio',
	'Dividend %': 'dividend',
	'Operating Margin': 'operating-margin',
	'Total assets': 'total-assets',
	'Total liabilities': 'total-liabilities',
	'Price to Book': 'price-to-book'
}

const DATA_COLUMN_IDS = [
	'currentPrice',
	'priceChangePercentage1d',
	'priceChangePercentage7d',
	'priceChangePercentage1m',
	'volume',
	'marketCap',
	'trailingPE',
	'dividendYield',
	'priceToBook',
	'operatingProfitMargin',
	'revenueTTM',
	'grossProfitTTM',
	'earningsTTM',
	'totalAssets',
	'totalLiabilities'
] as const

const PRESET_VISIBLE_COLUMNS: Record<EquitiesPreset, readonly string[]> = {
	'Market Cap': [
		'currentPrice',
		'priceChangePercentage1d',
		'priceChangePercentage7d',
		'priceChangePercentage1m',
		'volume',
		'marketCap'
	],
	Earnings: ['earningsTTM', 'revenueTTM', 'grossProfitTTM', 'operatingProfitMargin', 'trailingPE', 'marketCap'],
	Revenue: ['revenueTTM', 'grossProfitTTM', 'earningsTTM', 'operatingProfitMargin', 'marketCap'],
	'P/E ratio': ['trailingPE', 'currentPrice', 'earningsTTM', 'marketCap', 'priceToBook'],
	'Dividend %': ['dividendYield', 'currentPrice', 'marketCap', 'trailingPE'],
	'Operating Margin': ['operatingProfitMargin', 'revenueTTM', 'grossProfitTTM', 'earningsTTM', 'marketCap'],
	'Total assets': ['totalAssets', 'totalLiabilities', 'marketCap', 'currentPrice'],
	'Total liabilities': ['totalLiabilities', 'totalAssets', 'marketCap', 'currentPrice'],
	'Price to Book': ['priceToBook', 'currentPrice', 'marketCap', 'totalAssets']
}

const PRESET_SORTING: Record<EquitiesPreset, SortingState> = {
	'Market Cap': [{ id: 'marketCap', desc: true }],
	Earnings: [{ id: 'earningsTTM', desc: true }],
	Revenue: [{ id: 'revenueTTM', desc: true }],
	'P/E ratio': [{ id: 'trailingPE', desc: true }],
	'Dividend %': [{ id: 'dividendYield', desc: true }],
	'Operating Margin': [{ id: 'operatingProfitMargin', desc: true }],
	'Total assets': [{ id: 'totalAssets', desc: true }],
	'Total liabilities': [{ id: 'totalLiabilities', desc: true }],
	'Price to Book': [{ id: 'priceToBook', desc: true }]
}

function getPresetFromQuery(value?: string): EquitiesPreset {
	if (!value) return 'Market Cap'
	const match = EQUITIES_PRESETS.find((p) => PRESET_QUERY_SLUGS[p] === value)
	return match ?? 'Market Cap'
}

function buildPresetVisibility(preset: EquitiesPreset): VisibilityState {
	const visible = new Set(PRESET_VISIBLE_COLUMNS[preset])
	return Object.fromEntries(DATA_COLUMN_IDS.map((id) => [id, visible.has(id)]))
}

// ─────────────────────────────────────────────────────────────────────────────

function LastUpdated({ value }: { value: string }) {
	const isClient = useIsClient()
	return (
		<p className="shrink-0 text-right text-xs text-(--text-disabled)" suppressHydrationWarning>
			Last updated: {isClient ? formatEquitiesDateTime(value) : value}
		</p>
	)
}

export function EquitiesOverview({ companies }: IEquitiesListPageProps) {
	const router = useRouter()
	const presetQueryValue = readSingleQueryValue(router.query.rankBy)
	const activePreset = useMemo(() => getPresetFromQuery(presetQueryValue), [presetQueryValue])
	const columnVisibility = useMemo(() => buildPresetVisibility(activePreset), [activePreset])

	const setPreset = (preset: EquitiesPreset) => {
		void pushShallowQuery(router, { rankBy: PRESET_QUERY_SLUGS[preset] })
	}

	return (
		<div className="flex flex-col gap-2">
			{/* <div className="rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div className="flex flex-1 flex-col gap-1">
						<h1 className="text-xl font-bold">Equities</h1>
						<p className="max-w-2xl text-sm text-(--text-secondary)">
							Track live company rankings by market cap, price, volume, returns, valuation, and key TTM metrics.
						</p>
					</div>
					{lastUpdatedAt ? <LastUpdated value={lastUpdatedAt} /> : null}
				</div>
			</div> */}

			<div className="flex flex-wrap items-center justify-center gap-2">
				<span className="text-sm font-medium text-(--text-secondary)">Rank by</span>
				{EQUITIES_PRESETS.map((preset) => (
					<button
						key={preset}
						data-active={preset === activePreset}
						data-umami-event="equities-preset-click"
						data-umami-event-preset={PRESET_QUERY_SLUGS[preset] ?? 'market-cap'}
						onClick={() => startTransition(() => setPreset(preset))}
						className="rounded-full border border-(--old-blue) px-3 py-1 text-xs hover:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
					>
						{preset}
					</button>
				))}
			</div>

			<TableWithSearch
				key={activePreset}
				data={companies}
				columns={columns}
				placeholder="Search companies or tickers"
				columnToSearch="name"
				header="Company Rankings"
				sortingState={PRESET_SORTING[activePreset]}
				columnVisibility={columnVisibility}
				rowSize={56}
				compact
				showColumnSelect
				csvFileName="equities-rankings"
			/>
		</div>
	)
}
