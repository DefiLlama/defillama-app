import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { LoadingSpinner, LocalLoader } from '~/components/Loaders'
import { APYRange } from '~/containers/Yields/Filters/APYRange'
import { FilterByChain } from '~/containers/Yields/Filters/Chains'
import { ColumnFilters } from '~/containers/Yields/Filters/ColumnFilters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '~/containers/Yields/Filters/poolColumns'
import { FilterByToken } from '~/containers/Yields/Filters/Tokens'
import { useFormatYieldQueryParams } from '~/containers/Yields/hooks'
import { buildPoolsTrackingStats } from '~/containers/Yields/poolsPipeline'
import { useHolderStats, useVolatility } from '~/containers/Yields/queries/client'
import { PaginatedYieldsPoolTable } from '~/containers/Yields/Tables/Pools'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { getYieldPoolTokenVariantSet, getYieldTokenVariantSet } from '~/containers/Yields/tokenFilter'
import { extractPoolTokens } from '~/containers/Yields/utils'
import { fetchJson } from '~/utils/async'
import { pushShallowQuery } from '~/utils/routerQuery'
import { DEFAULT_TABLE_PAGE_SIZE } from './tableUtils'
import { TokenDeferredPaginationControls } from './TokenDeferredPaginationControls'

const ENABLED_COLUMNS = [...ALL_POOL_COLUMN_QUERY_KEYS]

const FILTER_QUERY_PARAMS = [
	'chain',
	'excludeChain',
	'yieldToken',
	'yieldExcludeToken',
	'minTvl',
	'maxTvl',
	'minApy',
	'maxApy',
	...ENABLED_COLUMNS
]
const ENABLED_COLUMNS_SET = new Set<string>(ENABLED_COLUMNS)
const FILTER_ONLY_PARAMS = FILTER_QUERY_PARAMS.filter((queryParam) => !ENABLED_COLUMNS_SET.has(queryParam))

const TOKEN_YIELDS_SECTION_ID = 'token-yields'
const DEFAULT_TABLE_SORTING: SortingState = [{ id: 'tvl', desc: true }]
const DEFAULT_TABLE_SORTING_KEY = JSON.stringify(DEFAULT_TABLE_SORTING)

async function fetchTokenYieldRows(tokenSymbol: string): Promise<IYieldTableRow[]> {
	return fetchJson<IYieldTableRow[]>(`/api/datasets/yields?token=${encodeURIComponent(tokenSymbol)}`)
}

interface TokenYieldsSectionProps {
	tokenSymbol: string
	initialData?: IYieldTableRow[]
	initialRowCount?: number
	initialChainList?: string[]
	initialTokensList?: string[]
}

function poolMatchesSelectedToken(poolTokenVariants: Set<string>, tokenVariants: Set<string>) {
	for (const tokenVariant of tokenVariants) {
		if (poolTokenVariants.has(tokenVariant)) return true
	}

	return false
}

export function TokenYieldsSection({
	tokenSymbol,
	initialData,
	initialRowCount,
	initialChainList,
	initialTokensList
}: TokenYieldsSectionProps) {
	const router = useRouter()
	const [shouldFetchFullData, setShouldFetchFullData] = React.useState(initialData == null)
	const [requestedPageIndex, setRequestedPageIndex] = React.useState(0)
	const [tableSorting, setTableSorting] = React.useState<SortingState>([...DEFAULT_TABLE_SORTING])
	const { data: fetchedRows, error } = useQuery({
		queryKey: ['token-yields', tokenSymbol],
		queryFn: () => fetchTokenYieldRows(tokenSymbol),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol) && shouldFetchFullData
	})
	const poolsList = React.useMemo(() => fetchedRows ?? initialData ?? [], [fetchedRows, initialData])
	const { data: volatility } = useVolatility({ enabled: shouldFetchFullData })
	const holderStatsConfigIds = React.useMemo(
		() => poolsList.map((pool) => pool.configID).filter((configID): configID is string => Boolean(configID)),
		[poolsList]
	)
	const { data: holderStats } = useHolderStats(holderStatsConfigIds, { enabled: shouldFetchFullData })
	const totalRowCount = fetchedRows?.length ?? initialRowCount ?? poolsList.length

	const chainList = React.useMemo(
		() =>
			fetchedRows
				? [
						...new Set(poolsList.map((pool) => pool.chains[0]).filter((chain): chain is string => Boolean(chain)))
					].sort()
				: (initialChainList ??
					[
						...new Set(poolsList.map((pool) => pool.chains[0]).filter((chain): chain is string => Boolean(chain)))
					].sort()),
		[fetchedRows, initialChainList, poolsList]
	)

	const tokensList = React.useMemo(
		() =>
			fetchedRows
				? [...new Set(poolsList.flatMap((pool) => extractPoolTokens(pool.pool)))]
						.sort()
						.map((token) => token.toUpperCase())
				: (initialTokensList ??
					[...new Set(poolsList.flatMap((pool) => extractPoolTokens(pool.pool)))]
						.sort()
						.map((token) => token.toUpperCase())),
		[fetchedRows, initialTokensList, poolsList]
	)

	const { selectedChains, includeTokens, excludeTokens, minTvl, maxTvl, minApy, maxApy } = useFormatYieldQueryParams({
		chainList,
		tokenQueryKey: 'yieldToken',
		excludeTokenQueryKey: 'yieldExcludeToken'
	})

	const includeTokenVariantSets = React.useMemo(() => includeTokens.map(getYieldTokenVariantSet), [includeTokens])
	const excludeTokenVariantSets = React.useMemo(() => excludeTokens.map(getYieldTokenVariantSet), [excludeTokens])

	const poolsWithVolatility = React.useMemo(() => {
		return poolsList.map((pool) => ({
			...pool,
			yieldTokenVariants: getYieldPoolTokenVariantSet(pool.pool),
			apyMedian30d: volatility?.[pool.configID]?.[1] ?? null,
			apyStd30d: volatility?.[pool.configID]?.[2] ?? null,
			cv30d: volatility?.[pool.configID]?.[3] ?? null,
			holderCount: holderStats?.[pool.configID]?.holderCount ?? null,
			avgPositionUsd: holderStats?.[pool.configID]?.avgPositionUsd ?? null,
			top10Pct: holderStats?.[pool.configID]?.top10Pct ?? null,
			holderChange7d: holderStats?.[pool.configID]?.holderChange7d ?? null,
			holderChange30d: holderStats?.[pool.configID]?.holderChange30d ?? null
		}))
	}, [holderStats, poolsList, volatility])

	const filteredPools = React.useMemo(() => {
		let pools = poolsWithVolatility

		if (selectedChains.length > 0 && selectedChains.length < chainList.length) {
			const chainSet = new Set(selectedChains)
			pools = pools.filter((pool) => chainSet.has(pool.chains[0]))
		}

		if (includeTokens.length > 0) {
			pools = pools.filter((pool) =>
				includeTokenVariantSets.some((tokenVariants) =>
					poolMatchesSelectedToken(pool.yieldTokenVariants, tokenVariants)
				)
			)
		}

		if (excludeTokens.length > 0) {
			pools = pools.filter(
				(pool) =>
					!excludeTokenVariantSets.some((tokenVariants) =>
						poolMatchesSelectedToken(pool.yieldTokenVariants, tokenVariants)
					)
			)
		}

		if (minTvl != null) {
			pools = pools.filter((pool) => pool.tvl != null && pool.tvl >= minTvl)
		}
		if (maxTvl != null) {
			pools = pools.filter((pool) => pool.tvl != null && pool.tvl <= maxTvl)
		}

		if (minApy != null) {
			pools = pools.filter((pool) => pool.apy != null && pool.apy >= minApy)
		}
		if (maxApy != null) {
			pools = pools.filter((pool) => pool.apy != null && pool.apy <= maxApy)
		}

		return pools
	}, [
		chainList.length,
		excludeTokenVariantSets,
		includeTokenVariantSets,
		excludeTokens.length,
		includeTokens.length,
		maxApy,
		maxTvl,
		minApy,
		minTvl,
		poolsWithVolatility,
		selectedChains
	])

	const filteredStats = React.useMemo(() => {
		return buildPoolsTrackingStats(filteredPools)
	}, [filteredPools])

	const hasVisibleFilters = React.useMemo(
		() =>
			FILTER_ONLY_PARAMS.some((key) => {
				const value = router.query[key]
				return Array.isArray(value) ? value.length > 0 : value != null && value !== ''
			}),
		[router.query]
	)
	const hasFetchTriggeringFilters = React.useMemo(
		() =>
			FILTER_QUERY_PARAMS.some((key) => {
				const value = router.query[key]
				return Array.isArray(value) ? value.length > 0 : value != null && value !== ''
			}),
		[router.query]
	)
	const hasPartialData = !fetchedRows && totalRowCount > poolsList.length
	const tableSortingKey = React.useMemo(() => JSON.stringify(tableSorting), [tableSorting])
	const hasNonDefaultSorting = tableSortingKey !== DEFAULT_TABLE_SORTING_KEY
	const isFetchingFullData =
		!fetchedRows &&
		!error &&
		(shouldFetchFullData ||
			(hasPartialData && (hasFetchTriggeringFilters || hasNonDefaultSorting || requestedPageIndex > 0)))
	const showInitialLoader = isFetchingFullData && poolsList.length === 0
	const showBackgroundLoading = isFetchingFullData && poolsList.length > 0

	React.useEffect(() => {
		if ((hasFetchTriggeringFilters || hasNonDefaultSorting) && !shouldFetchFullData) {
			setShouldFetchFullData(true)
		}
	}, [hasFetchTriggeringFilters, hasNonDefaultSorting, shouldFetchFullData])

	const resetFilters = () => {
		const updates: Record<string, undefined> = {}
		for (const key of FILTER_ONLY_PARAMS) {
			updates[key] = undefined
		}
		pushShallowQuery(router, updates)
	}

	const isFilteredEmpty = filteredPools.length === 0 && totalRowCount > 0
	const hasPlaceholderState = showInitialLoader || (error != null && poolsList.length === 0) || totalRowCount === 0
	const summaryText =
		filteredStats.noOfPoolsTracked > 0
			? hasPartialData && !hasFetchTriggeringFilters
				? `Showing ${filteredStats.noOfPoolsTracked} of ${totalRowCount} ${totalRowCount > 1 ? 'pools' : 'pool'}`
				: `Tracking ${filteredStats.noOfPoolsTracked} ${filteredStats.noOfPoolsTracked > 1 ? 'pools' : 'pool'}${
						filteredStats.averageAPY != null ? `, average APY ${filteredStats.averageAPY.toFixed(2)}%` : ''
					}`
			: null

	const requestFullDataPage = React.useCallback((pageIndex: number) => {
		setRequestedPageIndex(pageIndex)
		setShouldFetchFullData(true)
	}, [])

	const handleSortingChange = React.useCallback(
		(sortingState: SortingState) => {
			setTableSorting(sortingState)
			setRequestedPageIndex(0)
			if (hasPartialData && !fetchedRows) {
				setShouldFetchFullData(true)
			}
		},
		[fetchedRows, hasPartialData]
	)

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
			}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3 border-b border-(--cards-border) p-3">
				<h2
					className="group relative flex min-w-0 scroll-mt-24 items-center gap-1 text-xl font-bold"
					id={TOKEN_YIELDS_SECTION_ID}
				>
					Yields
					<a
						aria-hidden="true"
						tabIndex={-1}
						href={`#${TOKEN_YIELDS_SECTION_ID}`}
						className="absolute top-0 right-0 z-10 flex h-full w-full items-center"
					/>
					<Icon name="link" className="invisible h-3.5 w-3.5 group-hover:visible group-focus-visible:visible" />
				</h2>
				{!showInitialLoader && !error && summaryText ? (
					<p className="text-sm text-(--text-secondary) sm:text-right">{summaryText}</p>
				) : null}
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				{showInitialLoader ? (
					<div className="flex flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error && poolsList.length === 0 ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">{error.message}</p>
					</div>
				) : poolsList.length === 0 ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">No yield pools found.</p>
					</div>
				) : (
					<div className="flex flex-1 flex-col">
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="p-1">
								<ResponsiveFilterLayout>
									{(nestedMenu) => (
										<>
											<FilterByChain chainList={chainList} selectedChains={selectedChains} nestedMenu={nestedMenu} />
											<FilterByToken
												tokensList={tokensList}
												selectedTokens={includeTokens}
												nestedMenu={nestedMenu}
												autoApplyAttributes={false}
												queryKey="yieldToken"
												excludeQueryKey="yieldExcludeToken"
											/>
											<TVLRange variant="secondary" nestedMenu={nestedMenu} />
											<APYRange nestedMenu={nestedMenu} />
											<ColumnFilters enabledColumns={ENABLED_COLUMNS} nestedMenu={nestedMenu} />
											{hasVisibleFilters ? (
												<button
													onClick={resetFilters}
													className="rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)"
												>
													Reset filters
												</button>
											) : null}
										</>
									)}
								</ResponsiveFilterLayout>
							</div>
						</div>
						{error ? (
							<div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-sm text-(--text-label)">
								{error.message}
							</div>
						) : null}

						{isFilteredEmpty ? (
							<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
								<p className="p-2">No pools match current filters</p>
							</div>
						) : (
							<div className="relative flex flex-col gap-3">
								{showBackgroundLoading ? (
									<div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-(--app-bg)/60 backdrop-blur-[1px]">
										<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-3 py-2 text-sm text-(--text-secondary) shadow-xs">
											<LoadingSpinner size={12} />
											<span>Loading full dataset...</span>
										</div>
									</div>
								) : null}
								<div className={showBackgroundLoading ? 'opacity-60' : ''}>
									<PaginatedYieldsPoolTable
										key={`${fetchedRows ? 'full' : 'initial'}-${requestedPageIndex}-${tableSortingKey}`}
										data={filteredPools}
										enablePagination
										initialPageSize={DEFAULT_TABLE_PAGE_SIZE}
										initialPageIndex={fetchedRows ? requestedPageIndex : 0}
										sortingState={tableSorting}
										onSortingChange={handleSortingChange}
										interactionDisabled={showBackgroundLoading}
									/>
								</div>
								{hasPartialData && !hasFetchTriggeringFilters ? (
									<div className={showBackgroundLoading ? 'opacity-60' : ''}>
										<TokenDeferredPaginationControls
											totalCount={totalRowCount}
											isLoading={showBackgroundLoading}
											onRequestPage={requestFullDataPage}
										/>
									</div>
								) : null}
							</div>
						)}
					</div>
				)}
			</div>
		</section>
	)
}
