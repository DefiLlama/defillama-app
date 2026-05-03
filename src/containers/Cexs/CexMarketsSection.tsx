import { useQuery } from '@tanstack/react-query'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { type KeyboardEvent, useMemo, useReducer, useRef } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { formattedNum } from '~/utils'
import { fetchExchangeMarkets } from './api'
import type { ExchangeMarketCategory, ExchangeMarketPair, ExchangeMarketsResponse } from './markets.types'

const CEX_MARKETS_SECTION_ID = 'markets'

const CATEGORY_TABS: ReadonlyArray<{ id: ExchangeMarketCategory; label: string }> = [
	{ id: 'spot', label: 'Spot' },
	{ id: 'linear_perp', label: 'Linear Perp' },
	{ id: 'inverse_perp', label: 'Inverse Perp' }
]

const columnHelper = createColumnHelper<ExchangeMarketPair>()

function renderNullableNum(value: number | null | undefined, isUsd = false): string {
	if (value == null) return '–'
	return formattedNum(value, isUsd)
}

function renderFundingRate(value: number | null | undefined): string {
	if (value == null) return '–'
	return `${(value * 100).toFixed(4)}%`
}

const pairColumn = columnHelper.accessor('symbol', {
	id: 'symbol',
	header: 'Pair',
	enableSorting: false,
	cell: ({ getValue, row }) => {
		const pair = <span className="text-sm uppercase">{getValue()}</span>
		return row.original.pair_url ? (
			<a
				href={row.original.pair_url}
				target="_blank"
				rel="noopener noreferrer"
				className="text-(--link-text) hover:underline"
			>
				{pair}
			</a>
		) : (
			pair
		)
	}
})

const priceColumn = columnHelper.accessor((row) => row.price ?? undefined, {
	id: 'price',
	header: 'Price',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: { align: 'end' }
})

const volumeColumn = columnHelper.accessor((row) => row.volume_24h ?? undefined, {
	id: 'volume_24h',
	header: '24h Volume',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: { align: 'end' }
})

const oiColumn = columnHelper.accessor((row) => row.oi_usd ?? undefined, {
	id: 'oi_usd',
	header: 'Open Interest',
	cell: ({ getValue }) => renderNullableNum(getValue() ?? null, true),
	meta: { align: 'end' }
})

const fundingColumn = columnHelper.accessor((row) => row.funding_rate_8h ?? undefined, {
	id: 'funding_rate_8h',
	header: 'Funding (8h)',
	cell: ({ row }) => renderFundingRate(row.original.funding_rate_8h),
	meta: { align: 'end' }
})

const SPOT_COLUMNS: ColumnDef<ExchangeMarketPair, any>[] = [pairColumn, priceColumn, volumeColumn]
const PERP_COLUMNS: ColumnDef<ExchangeMarketPair, any>[] = [
	pairColumn,
	priceColumn,
	volumeColumn,
	oiColumn,
	fundingColumn
]

function getCategoryRows(data: ExchangeMarketsResponse, category: ExchangeMarketCategory): ExchangeMarketPair[] {
	return data.categories[category]?.pairs ?? []
}

function getAvailableCategories(data: ExchangeMarketsResponse): ExchangeMarketCategory[] {
	const categories: ExchangeMarketCategory[] = []
	for (const tab of CATEGORY_TABS) {
		if (getCategoryRows(data, tab.id).length > 0) categories.push(tab.id)
	}
	return categories
}

function HeaderStrip({
	data,
	category,
	showOi
}: {
	data: ExchangeMarketsResponse
	category: ExchangeMarketCategory
	showOi: boolean
}) {
	const totals = data.categories[category]
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3.5 py-2.5">
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm text-(--text-label)">Pairs</span>
				<span className="text-sm font-medium">{formattedNum(totals?.market_count ?? 0)}</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm text-(--text-label)">24h Volume</span>
				<span className="text-sm font-medium">{renderNullableNum(totals?.total_volume_24h, true)}</span>
			</div>
			{showOi ? (
				<div className="flex items-baseline gap-1.5">
					<span className="text-sm text-(--text-label)">Open Interest</span>
					<span className="text-sm font-medium">{renderNullableNum(totals?.total_oi_usd, true)}</span>
				</div>
			) : null}
		</div>
	)
}

function Tabs<T extends string>({
	tabs,
	activeTab,
	onChange,
	ariaLabel
}: {
	tabs: ReadonlyArray<{ id: T; label: string }>
	activeTab: T
	onChange: (id: T) => void
	ariaLabel: string
}) {
	const buttonRefs = useRef<Array<HTMLButtonElement | null>>([])
	const focusTab = (index: number) => {
		const tab = tabs[index]
		if (!tab) return
		onChange(tab.id)
		buttonRefs.current[index]?.focus()
	}
	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
		if (event.key === 'ArrowLeft') {
			event.preventDefault()
			focusTab((index - 1 + tabs.length) % tabs.length)
		} else if (event.key === 'ArrowRight') {
			event.preventDefault()
			focusTab((index + 1) % tabs.length)
		} else if (event.key === 'Home') {
			event.preventDefault()
			focusTab(0)
		} else if (event.key === 'End') {
			event.preventDefault()
			focusTab(tabs.length - 1)
		}
	}

	return (
		<div className="flex items-center overflow-x-auto" role="tablist" aria-label={ariaLabel}>
			{tabs.map((tab, index) => (
				<button
					key={tab.id}
					ref={(node) => {
						buttonRefs.current[index] = node
					}}
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					tabIndex={activeTab === tab.id ? 0 : -1}
					data-active={activeTab === tab.id}
					onClick={() => onChange(tab.id)}
					onKeyDown={(event) => handleKeyDown(event, index)}
					className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
				>
					{tab.label}
				</button>
			))}
		</div>
	)
}

interface CexMarketsSectionProps {
	exchange: string
	name: string
}

export function CexMarketsSection({ exchange, name }: CexMarketsSectionProps) {
	const [categoryTab, setCategoryTab] = useReducer(
		(_: ExchangeMarketCategory, next: ExchangeMarketCategory) => next,
		'spot'
	)

	const { data, error, isLoading } = useQuery({
		queryKey: ['exchange-markets', exchange],
		queryFn: () => fetchExchangeMarkets(exchange),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(exchange)
	})

	const visibleCategoryTabs = useMemo(() => (data ? getAvailableCategories(data) : []), [data])
	const selectedCategoryTab = visibleCategoryTabs.some((tab) => tab === categoryTab)
		? categoryTab
		: (visibleCategoryTabs[0] ?? categoryTab)
	const rows = useMemo(() => (data ? getCategoryRows(data, selectedCategoryTab) : []), [data, selectedCategoryTab])
	const isPerpCategory = selectedCategoryTab !== 'spot'
	const columns = isPerpCategory ? PERP_COLUMNS : SPOT_COLUMNS
	const lastUpdated = useMemo(() => {
		if (!data?.last_updated) return null
		const parsed = dayjs(data.last_updated)
		if (!parsed.isValid()) return null
		return { absolute: parsed.format('MMM D, YYYY HH:mm UTC'), relative: parsed.fromNow() }
	}, [data])

	const sectionHeader = (
		<div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--cards-border) p-3">
			<h2 className="group relative flex scroll-mt-24 items-center gap-1 text-xl font-bold" id={CEX_MARKETS_SECTION_ID}>
				Markets
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${CEX_MARKETS_SECTION_ID}`}
					className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
				/>
				<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
			</h2>
			{lastUpdated ? (
				<span className="text-xs text-(--text-label)" title={lastUpdated.absolute}>
					Updated {lastUpdated.relative}
				</span>
			) : null}
		</div>
	)

	if (isLoading) {
		return (
			<section className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[360px] items-center justify-center p-3">
					<LocalLoader />
				</div>
			</section>
		)
	}

	if (error || !data || visibleCategoryTabs.length === 0 || rows.length === 0) {
		return null
	}

	return (
		<section className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{sectionHeader}
			<div className="flex flex-col gap-3 p-3">
				<HeaderStrip data={data} category={selectedCategoryTab} showOi={isPerpCategory} />

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<TableWithSearch
						key={`${exchange}-${selectedCategoryTab}`}
						data={rows}
						columns={columns}
						leadingControls={
							<Tabs
								tabs={CATEGORY_TABS.filter((tab) => visibleCategoryTabs.includes(tab.id))}
								activeTab={selectedCategoryTab}
								onChange={(id) => setCategoryTab(id)}
								ariaLabel="Market category"
							/>
						}
						columnToSearch="symbol"
						placeholder="Search pairs..."
						csvFileName={`cex-markets-${name}-${selectedCategoryTab}`}
						embedded
						sortingState={[{ id: 'volume_24h', desc: true }]}
					/>
				</div>
			</div>
		</section>
	)
}
