import { useQuery } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
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

async function fetchTokenYieldRows(tokenSymbol: string): Promise<IYieldTableRow[]> {
	return fetchJson<IYieldTableRow[]>(`/api/datasets/yields?token=${encodeURIComponent(tokenSymbol)}`)
}

interface TokenYieldsSectionProps {
	tokenSymbol: string
}

function poolMatchesSelectedToken(poolTokenVariants: Set<string>, tokenVariants: Set<string>) {
	for (const tokenVariant of tokenVariants) {
		if (poolTokenVariants.has(tokenVariant)) return true
	}

	return false
}

export function TokenYieldsSection({ tokenSymbol }: TokenYieldsSectionProps) {
	const router = useRouter()
	const {
		data: rows,
		error,
		isLoading
	} = useQuery({
		queryKey: ['token-yields', tokenSymbol],
		queryFn: () => fetchTokenYieldRows(tokenSymbol),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(tokenSymbol)
	})
	const poolsList = React.useMemo(() => rows ?? [], [rows])
	const { data: volatility } = useVolatility()
	const holderStatsConfigIds = React.useMemo(
		() => poolsList.map((pool) => pool.configID).filter((configID): configID is string => Boolean(configID)),
		[poolsList]
	)
	const { data: holderStats } = useHolderStats(holderStatsConfigIds)

	const chainList = React.useMemo(
		() =>
			[...new Set(poolsList.map((pool) => pool.chains[0]).filter((chain): chain is string => Boolean(chain)))].sort(),
		[poolsList]
	)

	const tokensList = React.useMemo(
		() =>
			[...new Set(poolsList.flatMap((pool) => extractPoolTokens(pool.pool)))]
				.sort()
				.map((token) => token.toUpperCase()),
		[poolsList]
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

	const hasActiveFilters = React.useMemo(
		() =>
			FILTER_ONLY_PARAMS.some((key) => {
				const value = router.query[key]
				return Array.isArray(value) ? value.length > 0 : value != null && value !== ''
			}),
		[router.query]
	)

	const resetFilters = () => {
		const updates: Record<string, undefined> = {}
		for (const key of FILTER_ONLY_PARAMS) {
			updates[key] = undefined
		}
		pushShallowQuery(router, updates)
	}

	const isFilteredEmpty = filteredPools.length === 0 && poolsList.length > 0
	const hasPlaceholderState = isLoading || error != null || poolsList.length === 0

	return (
		<section
			className={`flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)${
				hasPlaceholderState ? ' min-h-[80dvh] sm:min-h-[572px]' : ''
			}`}
		>
			<div className="border-b border-(--cards-border) p-3">
				<h2
					className="group relative flex min-w-0 scroll-mt-4 items-center gap-1 text-xl font-bold"
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
			</div>

			<div className="flex flex-1 flex-col gap-3 p-3">
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LocalLoader />
					</div>
				) : error ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">{error.message}</p>
					</div>
				) : poolsList.length === 0 ? (
					<div className="flex flex-1 items-center justify-center px-4 text-center">
						<p className="text-sm text-(--text-label)">No yield pools found.</p>
					</div>
				) : (
					<>
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<div className="flex flex-wrap items-center gap-2 p-3">
								<span>
									{filteredStats.noOfPoolsTracked > 0
										? `Tracking ${filteredStats.noOfPoolsTracked} ${
												filteredStats.noOfPoolsTracked > 1 ? 'pools' : 'pool'
											}${filteredStats.averageAPY != null ? `, average APY ${filteredStats.averageAPY.toFixed(2)}%` : ''}`
										: 'No pools matching filters'}
								</span>
							</div>
							<div className="p-3">
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
											{hasActiveFilters ? (
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

						{isFilteredEmpty ? (
							<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
								<p className="p-2">No pools match current filters</p>
							</div>
						) : (
							<PaginatedYieldsPoolTable
								data={filteredPools}
								enablePagination
								initialPageSize={10}
								sortingState={DEFAULT_TABLE_SORTING}
							/>
						)}
					</>
				)}
			</div>
		</section>
	)
}
