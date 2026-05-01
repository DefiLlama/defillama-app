import { useQuery } from '@tanstack/react-query'
import { type ColumnDef, createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo, useReducer } from 'react'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TokenLogo } from '~/components/TokenLogo'
import { formattedNum } from '~/utils'
import { fetchTokenMarkets } from './api'
import type {
	TokenMarketCategory,
	TokenMarketCategoryTotals,
	TokenMarketPair,
	TokenMarketsResponse,
	TokenMarketVenue
} from './tokenMarkets.types'

const TOKEN_MARKETS_SECTION_ID = 'token-markets'

type VenueTabId = 'dex' | 'cex' | 'all'

const VENUE_TABS: ReadonlyArray<{ id: VenueTabId; label: string }> = [
	{ id: 'dex', label: 'DEX' },
	{ id: 'cex', label: 'CEX' },
	{ id: 'all', label: 'All' }
]

const CATEGORY_TABS: ReadonlyArray<{ id: TokenMarketCategory; label: string }> = [
	{ id: 'spot', label: 'Spot' },
	{ id: 'linear_perp', label: 'Linear Perp' },
	{ id: 'inverse_perp', label: 'Inverse Perp' }
]

const EMPTY_TOTALS: TokenMarketCategoryTotals = { pair_count: 0, total_volume_24h: 0, total_oi_usd: null }

const columnHelper = createColumnHelper<TokenMarketPair>()

function renderNullableNum(value: number | null | undefined, isUsd = false): string {
	if (value == null) return '–'
	return formattedNum(value, isUsd)
}

function NullableNum({ value, isUsd = false }: { value: number | null | undefined; isUsd?: boolean }) {
	return <>{value == null ? '–' : formattedNum(value, isUsd)}</>
}

function renderFundingRate(value: number | null | undefined): string {
	if (value == null) return '–'
	const pct = value * 100
	return `${pct.toFixed(4)}%`
}

const venueColumn = columnHelper.accessor('exchange', {
	id: 'exchange',
	header: 'Venue',
	enableSorting: false,
	cell: ({ getValue, row }) => {
		const exchange = getValue()
		const url = row.original.pair_url
		const label = (
			<span className="flex items-center gap-2">
				<TokenLogo name={exchange} kind="token" alt={`Logo of ${exchange}`} size={20} />
				<span className="text-sm capitalize">{exchange}</span>
			</span>
		)
		return url ? (
			<a href={url} target="_blank" rel="noopener noreferrer" className="text-(--link-text) hover:underline">
				{label}
			</a>
		) : (
			label
		)
	}
})

const pairColumn = columnHelper.accessor('symbol', {
	id: 'symbol',
	header: 'Pair',
	enableSorting: false,
	cell: ({ getValue }) => <span className="text-sm uppercase">{getValue()}</span>
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

const SPOT_COLUMNS: ColumnDef<TokenMarketPair, any>[] = [venueColumn, pairColumn, priceColumn, volumeColumn]
const PERP_COLUMNS: ColumnDef<TokenMarketPair, any>[] = [
	venueColumn,
	pairColumn,
	priceColumn,
	volumeColumn,
	oiColumn,
	fundingColumn
]

function getCategoryRows(
	data: TokenMarketsResponse,
	venue: VenueTabId,
	category: TokenMarketCategory
): TokenMarketPair[] {
	if (venue === 'dex') return data.dex[category] ?? []
	if (venue === 'cex') return data.cex[category] ?? []
	const dexRows = data.dex[category] ?? []
	const cexRows = data.cex[category] ?? []
	return [...dexRows, ...cexRows].sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))
}

function getCategoryTotals(
	data: TokenMarketsResponse,
	venue: VenueTabId,
	category: TokenMarketCategory
): TokenMarketCategoryTotals {
	if (venue === 'all') {
		const dex = data.totals.dex?.[category] ?? EMPTY_TOTALS
		const cex = data.totals.cex?.[category] ?? EMPTY_TOTALS
		return {
			pair_count: dex.pair_count + cex.pair_count,
			total_volume_24h: (dex.total_volume_24h ?? 0) + (cex.total_volume_24h ?? 0),
			total_oi_usd:
				dex.total_oi_usd == null && cex.total_oi_usd == null ? null : (dex.total_oi_usd ?? 0) + (cex.total_oi_usd ?? 0)
		}
	}
	return data.totals[venue as TokenMarketVenue]?.[category] ?? EMPTY_TOTALS
}

function getAvailableCategories(data: TokenMarketsResponse, venue: VenueTabId): TokenMarketCategory[] {
	const categories: TokenMarketCategory[] = []
	for (const tab of CATEGORY_TABS) {
		if (getCategoryRows(data, venue, tab.id).length > 0) categories.push(tab.id)
	}
	return categories
}

function HeaderStrip({ totals, showOi }: { totals: TokenMarketCategoryTotals; showOi: boolean }) {
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3.5 py-2.5">
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm text-(--text-label)">Pairs</span>
				<span className="text-sm font-medium">{formattedNum(totals.pair_count)}</span>
			</div>
			<div className="flex items-baseline gap-1.5">
				<span className="text-sm text-(--text-label)">24h Volume</span>
				<span className="text-sm font-medium">
					<NullableNum value={totals.total_volume_24h} isUsd />
				</span>
			</div>
			{showOi ? (
				<div className="flex items-baseline gap-1.5">
					<span className="text-sm text-(--text-label)">Open Interest</span>
					<span className="text-sm font-medium">
						<NullableNum value={totals.total_oi_usd} isUsd />
					</span>
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
	return (
		<div className="flex items-center overflow-x-auto" role="tablist" aria-label={ariaLabel}>
			{tabs.map((tab) => (
				<button
					key={tab.id}
					type="button"
					role="tab"
					aria-selected={activeTab === tab.id}
					tabIndex={activeTab === tab.id ? 0 : -1}
					data-active={activeTab === tab.id}
					onClick={() => onChange(tab.id)}
					className="shrink-0 border-b-2 border-(--form-control-border) px-4 py-1 whitespace-nowrap hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) data-[active=true]:border-(--primary)"
				>
					{tab.label}
				</button>
			))}
		</div>
	)
}

interface TokenMarketsSectionProps {
	tokenSymbol: string
}

export function TokenMarketsSection({ tokenSymbol }: TokenMarketsSectionProps) {
	const [venueTab, setVenueTab] = useReducer((_: VenueTabId, next: VenueTabId) => next, 'dex')
	const [categoryTab, setCategoryTab] = useReducer((_: TokenMarketCategory, next: TokenMarketCategory) => next, 'spot')

	const { data, error, isLoading } = useQuery({
		queryKey: ['token-markets', tokenSymbol],
		queryFn: () => fetchTokenMarkets(tokenSymbol),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol)
	})

	const availableCategoriesByVenue = useMemo(() => {
		if (!data) {
			return { dex: [], cex: [], all: [] } as Record<VenueTabId, TokenMarketCategory[]>
		}
		return {
			dex: getAvailableCategories(data, 'dex'),
			cex: getAvailableCategories(data, 'cex'),
			all: getAvailableCategories(data, 'all')
		} as Record<VenueTabId, TokenMarketCategory[]>
	}, [data])

	const visibleVenueTabs = useMemo(
		() => VENUE_TABS.filter((tab) => availableCategoriesByVenue[tab.id].length > 0),
		[availableCategoriesByVenue]
	)

	const selectedVenueTab = visibleVenueTabs.some((tab) => tab.id === venueTab)
		? venueTab
		: (visibleVenueTabs[0]?.id ?? venueTab)

	const visibleCategoryTabs = useMemo(() => {
		const available = new Set(availableCategoriesByVenue[selectedVenueTab])
		return CATEGORY_TABS.filter((tab) => available.has(tab.id))
	}, [availableCategoriesByVenue, selectedVenueTab])

	const selectedCategoryTab = useMemo<TokenMarketCategory>(() => {
		if (visibleCategoryTabs.some((tab) => tab.id === categoryTab)) return categoryTab
		return visibleCategoryTabs[0]?.id ?? categoryTab
	}, [visibleCategoryTabs, categoryTab])

	const rows = useMemo(
		() => (data ? getCategoryRows(data, selectedVenueTab, selectedCategoryTab) : []),
		[data, selectedVenueTab, selectedCategoryTab]
	)
	const totals = useMemo(
		() => (data ? getCategoryTotals(data, selectedVenueTab, selectedCategoryTab) : EMPTY_TOTALS),
		[data, selectedVenueTab, selectedCategoryTab]
	)

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
			<h2
				className="group relative flex scroll-mt-24 items-center gap-1 text-xl font-bold"
				id={TOKEN_MARKETS_SECTION_ID}
			>
				Markets
				<a
					aria-hidden="true"
					tabIndex={-1}
					href={`#${TOKEN_MARKETS_SECTION_ID}`}
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
			<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{sectionHeader}
				<div className="flex min-h-[360px] items-center justify-center p-3">
					<LocalLoader />
				</div>
			</section>
		)
	}

	if (error || !data) {
		return null
	}

	if (visibleVenueTabs.length === 0 || rows.length === 0) {
		return null
	}

	return (
		<section className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			{sectionHeader}
			<div className="flex flex-col gap-3 p-3">
				<Tabs
					tabs={visibleVenueTabs}
					activeTab={selectedVenueTab}
					onChange={(id) => setVenueTab(id)}
					ariaLabel="Market venue"
				/>

				<HeaderStrip totals={totals} showOi={isPerpCategory} />

				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<TableWithSearch
						key={`${selectedVenueTab}-${selectedCategoryTab}`}
						data={rows}
						columns={columns}
						leadingControls={
							<Tabs
								tabs={visibleCategoryTabs}
								activeTab={selectedCategoryTab}
								onChange={(id) => setCategoryTab(id)}
								ariaLabel="Market category"
							/>
						}
						columnToSearch="exchange"
						placeholder="Search exchanges..."
						csvFileName={`token-markets-${tokenSymbol}-${selectedVenueTab}-${selectedCategoryTab}`}
						embedded
						sortingState={[{ id: 'volume_24h', desc: true }]}
					/>
				</div>
			</div>
		</section>
	)
}
