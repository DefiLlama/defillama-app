import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { useRouter } from 'next/router'
import * as React from 'react'
import { ResponsiveFilterLayout } from '~/components/Filters/ResponsiveFilterLayout'
import { TVLRange } from '~/components/Filters/TVLRange'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { APYRange } from '~/containers/Yields/Filters/APYRange'
import { FilterByChain } from '~/containers/Yields/Filters/Chains'
import { ColumnFilters } from '~/containers/Yields/Filters/ColumnFilters'
import { ALL_POOL_COLUMN_QUERY_KEYS } from '~/containers/Yields/Filters/poolColumns'
import { FilterByToken } from '~/containers/Yields/Filters/Tokens'
import { useFormatYieldQueryParams } from '~/containers/Yields/hooks'
import {
	buildPoolsTrackingStats,
	filterPoolTableRows,
	getPoolRowChains,
	getPoolRowTokens
} from '~/containers/Yields/poolsPipeline'
import { useHolderStats, useVolatility } from '~/containers/Yields/queries/client'
import { clearYieldsQueries, hasActiveYieldsQueries } from '~/containers/Yields/queryState'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'
import { pushShallowQuery } from '~/utils/routerQuery'

const EMPTY_TOGGLE_OPTIONS = []

export const getStaticProps = withPerformanceLogging(
	'protocol/yields/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true }
		}
		const { protocol } = params
		const normalizedName = slug(protocol)
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const { protocolMetadata } = metadataCache
		let metadata: [string, IProtocolMetadata] | undefined
		for (const key in protocolMetadata) {
			if (slug(protocolMetadata[key].displayName) === normalizedName) {
				metadata = [key, protocolMetadata[key]]
				break
			}
		}

		if (!metadata || !metadata[1].yields) {
			return { notFound: true }
		}

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		if (!protocolData) {
			return { notFound: true }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })
		const seoTitle = `${protocolData.name} Yield Pools & APY Rankings - DefiLlama`
		const seoDescription = `Explore ${protocolData.name} yield pools, APY rankings, and liquidity farming opportunities across chains on DefiLlama.`
		const protocolSlug = sluggifyProtocol(protocolData.name)
		const otherProtocolsSet = new Set<string>()
		for (const otherProtocol of protocolData.otherProtocols ?? []) {
			otherProtocolsSet.add(sluggifyProtocol(otherProtocol))
		}

		let poolsError: string | null = null
		let poolsList: IYieldTableRow[] = []
		try {
			const protocolSlugs = [protocolSlug]
			if (!protocolData.parentProtocol) {
				for (const otherProtocolSlug of otherProtocolsSet) {
					if (otherProtocolSlug !== protocolSlug) {
						protocolSlugs.push(otherProtocolSlug)
					}
				}
			}

			const { getProtocolYieldRows } = await import('~/server/datasetCache/runtime/yields')
			poolsList = await getProtocolYieldRows(protocolSlugs)
		} catch (err) {
			console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
			poolsError = 'Failed to fetch'
		}

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics,
				poolsList,
				poolsError,
				warningBanners: getProtocolWarningBanners(protocolData),
				seoTitle,
				seoDescription
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export const getStaticPaths = () => {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

const FILTER_QUERY_PARAMS = [
	'chain',
	'excludeChain',
	'token',
	'excludeToken',
	'minTvl',
	'maxTvl',
	'minApy',
	'maxApy',
	...ALL_POOL_COLUMN_QUERY_KEYS
]

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const router = useRouter()
	const { data: volatility } = useVolatility()
	const poolsList = React.useMemo(() => props.poolsList ?? [], [props.poolsList])
	const { data: holderStats } = useHolderStats(poolsList.map((pool) => pool.configID))
	const rowsWithStats = React.useMemo(
		() =>
			poolsList.map((pool) => ({
				...pool,
				apyMedian30d: volatility?.[pool.configID]?.[1] ?? pool.apyMedian30d ?? null,
				apyStd30d: volatility?.[pool.configID]?.[2] ?? pool.apyStd30d ?? null,
				cv30d: volatility?.[pool.configID]?.[3] ?? pool.cv30d ?? null,
				holderCount: holderStats?.[pool.configID]?.holderCount ?? pool.holderCount ?? null,
				avgPositionUsd: holderStats?.[pool.configID]?.avgPositionUsd ?? pool.avgPositionUsd ?? null,
				top10Pct: holderStats?.[pool.configID]?.top10Pct ?? pool.top10Pct ?? null,
				holderChange7d: holderStats?.[pool.configID]?.holderChange7d ?? pool.holderChange7d ?? null,
				holderChange30d: holderStats?.[pool.configID]?.holderChange30d ?? pool.holderChange30d ?? null
			})),
		[poolsList, volatility, holderStats]
	)
	const chainList = React.useMemo(() => getPoolRowChains(rowsWithStats), [rowsWithStats])
	const tokensList = React.useMemo(() => getPoolRowTokens(rowsWithStats), [rowsWithStats])

	const { selectedChains, includeTokens, excludeTokens, minTvl, maxTvl, minApy, maxApy } = useFormatYieldQueryParams({
		chainList
	})

	const filteredPools = React.useMemo(() => {
		return filterPoolTableRows(rowsWithStats, {
			selectedChains,
			chainList,
			includeTokens,
			excludeTokens,
			minTvl,
			maxTvl,
			minApy,
			maxApy
		})
	}, [rowsWithStats, selectedChains, chainList, includeTokens, excludeTokens, minTvl, maxTvl, minApy, maxApy])

	const filteredStats = React.useMemo(() => buildPoolsTrackingStats(filteredPools), [filteredPools])

	const hasActiveFilters = hasActiveYieldsQueries(router.query, FILTER_QUERY_PARAMS)

	const resetFilters = () => {
		pushShallowQuery(router, clearYieldsQueries(FILTER_QUERY_PARAMS))
	}

	const isFilteredEmpty = filteredPools.length === 0 && poolsList.length > 0

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="yields"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
			seoTitle={props.seoTitle}
			seoDescription={props.seoDescription}
		>
			{poolsList.length > 0 && (
				<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex flex-wrap items-center gap-2 p-3">
						<span>
							{filteredStats.noOfPoolsTracked > 0
								? `Tracking ${filteredStats.noOfPoolsTracked} ${filteredStats.noOfPoolsTracked > 1 ? 'pools' : 'pool'}${filteredStats.averageAPY != null ? `, average APY ${filteredStats.averageAPY.toFixed(2)}%` : ''}`
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
									/>
									<TVLRange variant="secondary" nestedMenu={nestedMenu} />
									<APYRange nestedMenu={nestedMenu} />
									<ColumnFilters enabledColumns={ALL_POOL_COLUMN_QUERY_KEYS} nestedMenu={nestedMenu} />
									{hasActiveFilters && (
										<button
											onClick={resetFilters}
											className="rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg)"
										>
											Reset filters
										</button>
									)}
								</>
							)}
						</ResponsiveFilterLayout>
					</div>
				</div>
			)}
			{props.poolsError ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="p-2">{props.poolsError}</p>
				</div>
			) : isFilteredEmpty ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="p-2">No pools match current filters</p>
				</div>
			) : poolsList.length === 0 ? (
				<div className="flex flex-1 flex-col items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="p-2">No yield pools for this protocol</p>
				</div>
			) : (
				<YieldsPoolsTable data={filteredPools} />
			)}
		</ProtocolOverviewLayout>
	)
}
