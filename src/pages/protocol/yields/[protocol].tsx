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
import { FilterByToken } from '~/containers/Yields/Filters/Tokens'
import { useFormatYieldQueryParams } from '~/containers/Yields/hooks'
import { useVolatility } from '~/containers/Yields/queries/client'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { extractPoolTokens, normalizeToken } from '~/containers/Yields/utils'
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
		const otherProtocolsSet = new Set((protocolData.otherProtocols ?? []).map((op) => sluggifyProtocol(op)))

		let poolsError: string | null = null
		let poolsList: IYieldTableRow[] = []
		try {
			const { getYieldPageData } = await import('~/containers/Yields/queries/index')
			const yieldsData = await getYieldPageData()
			const allPools = yieldsData?.props?.pools ?? []
			poolsList = allPools
				.filter(
					(pool) =>
						pool.project === protocolSlug || (protocolData.parentProtocol ? false : otherProtocolsSet.has(pool.project))
				)
				.map((pool) => ({
					...pool,
					tvl: pool.tvlUsd,
					pool: pool.symbol,
					configID: pool.pool,
					chains: [pool.chain],
					project: pool.projectName,
					projectslug: pool.project
				}))
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

const FILTER_QUERY_PARAMS = ['chain', 'excludeChain', 'token', 'excludeToken', 'minTvl', 'maxTvl', 'minApy', 'maxApy']

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const router = useRouter()
	const { data: volatility } = useVolatility()
	const poolsList = React.useMemo(() => props.poolsList ?? [], [props.poolsList])

	const chainList = React.useMemo(() => [...new Set(poolsList.map((p) => p.chains[0]))].sort(), [poolsList])

	const tokensList = React.useMemo(
		() => [...new Set(poolsList.flatMap((p) => extractPoolTokens(p.pool)))].sort(),
		[poolsList]
	)

	const { selectedChains, includeTokens, excludeTokens, minTvl, maxTvl, minApy, maxApy } = useFormatYieldQueryParams({
		chainList
	})

	const poolsWithVolatility = React.useMemo(() => {
		return poolsList.map((pool) => ({
			...pool,
			apyMedian30d: volatility?.[pool.configID]?.[1] ?? null,
			apyStd30d: volatility?.[pool.configID]?.[2] ?? null,
			cv30d: volatility?.[pool.configID]?.[3] ?? null
		}))
	}, [poolsList, volatility])

	const filteredPools = React.useMemo(() => {
		let pools = poolsWithVolatility

		// Chain filter
		if (selectedChains.length > 0 && selectedChains.length < chainList.length) {
			const chainSet = new Set(selectedChains)
			pools = pools.filter((p) => chainSet.has(p.chains[0]))
		}

		// Token include filter (substring match, consistent with toFilterPool)
		if (includeTokens.length > 0) {
			pools = pools.filter((p) => {
				const poolTokens = extractPoolTokens(p.pool)
				return includeTokens.some((t) => poolTokens.some((pt) => pt.includes(normalizeToken(t))))
			})
		}

		// Token exclude filter (exact match, consistent with toFilterPool)
		if (excludeTokens.length > 0) {
			pools = pools.filter((p) => {
				const poolTokens = new Set(extractPoolTokens(p.pool))
				return !excludeTokens.some((t) => poolTokens.has(normalizeToken(t)))
			})
		}

		// TVL range
		if (minTvl != null) {
			pools = pools.filter((p) => p.tvl != null && p.tvl >= minTvl)
		}
		if (maxTvl != null) {
			pools = pools.filter((p) => p.tvl != null && p.tvl <= maxTvl)
		}

		// APY range (strict comparison, consistent with toFilterPool)
		if (minApy != null) {
			pools = pools.filter((p) => p.apy != null && p.apy > minApy)
		}
		if (maxApy != null) {
			pools = pools.filter((p) => p.apy != null && p.apy < maxApy)
		}

		return pools
	}, [
		poolsWithVolatility,
		selectedChains,
		chainList.length,
		includeTokens,
		excludeTokens,
		minTvl,
		maxTvl,
		minApy,
		maxApy
	])

	const filteredStats = React.useMemo(() => {
		const withApy = filteredPools.filter((p) => p.apy !== 0)
		return {
			noOfPoolsTracked: filteredPools.length,
			averageAPY: withApy.length > 0 ? withApy.reduce((acc, { apy }) => acc + apy, 0) / withApy.length : null
		}
	}, [filteredPools])

	const hasActiveFilters = FILTER_QUERY_PARAMS.some((key) => router.query[key] != null && router.query[key] !== '')

	const resetFilters = () => {
		const updates: Record<string, undefined> = {}
		for (const key of FILTER_QUERY_PARAMS) {
			updates[key] = undefined
		}
		pushShallowQuery(router, updates)
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
