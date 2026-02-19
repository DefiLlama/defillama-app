import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useVolatility } from '~/containers/Yields/queries/client'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { slug } from '~/utils'
import { sluggifyProtocol } from '~/utils/cache-client'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []
type ProtocolYieldPoolRow = {
	apy: number | null
	configID: string
} & Record<string, unknown>

export const getStaticProps = withPerformanceLogging(
	'protocol/yields/[protocol]',
	async ({ params }: GetStaticPropsContext<{ protocol: string }>) => {
		if (!params?.protocol) {
			return { notFound: true, props: null }
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
			return { notFound: true, props: null }
		}

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })
		const protocolSlug = slug(protocolData.name)
		const otherProtocolsSet = new Set((protocolData.otherProtocols ?? []).map((op) => sluggifyProtocol(op)))

		let poolsError: string | null = null
		let poolsList: ProtocolYieldPoolRow[] = []
		try {
			const { getYieldPageData } = await import('~/containers/Yields/queries/index')
			const yieldsData = await getYieldPageData()
			const allPools = yieldsData?.props?.pools ?? []
			poolsList = allPools
				.filter(
					(pool) =>
						pool.project === protocolSlug ||
						(protocolData.parentProtocol ? false : otherProtocolsSet.has(pool.project))
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

		const projectYields = poolsList.filter((pool) => pool.apy != 0)

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics,
				yields:
					projectYields.length > 0
						? {
								noOfPoolsTracked: projectYields.length,
								averageAPY: projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length
							}
						: null,
				poolsList,
				poolsError,
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
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

export default function Protocols(props: InferGetStaticPropsType<typeof getStaticProps>) {
	const { data: volatility } = useVolatility()
	const poolsList = React.useMemo(() => props.poolsList ?? [], [props.poolsList])

	const poolsWithVolatility = React.useMemo(() => {
		return poolsList.map((pool) => ({
			...pool,
			apyMedian30d: volatility?.[pool.configID]?.[1] ?? null,
			apyStd30d: volatility?.[pool.configID]?.[2] ?? null,
			cv30d: volatility?.[pool.configID]?.[3] ?? null
		}))
	}, [poolsList, volatility])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="yields"
			warningBanners={props.warningBanners}
			toggleOptions={EMPTY_TOGGLE_OPTIONS}
		>
			<div className="flex flex-1 flex-col gap-1 xl:flex-row">
				<div className="flex flex-1 flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<p className="flex items-center gap-2">
						<span>Number of pools tracked</span>
						<span>:</span>
						<span>{props.yields?.noOfPoolsTracked}</span>
					</p>
					<p className="flex items-center gap-2">
						<span>Average APY</span>
						<span>:</span>
						<span>
							{props.yields?.averageAPY != null && Number.isFinite(props.yields.averageAPY)
								? `${props.yields.averageAPY.toFixed(2)}%`
								: 'N/A'}
						</span>
					</p>

					{props.poolsError ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<p className="p-2">{props.poolsError}</p>
						</div>
					) : poolsList.length === 0 ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<p className="p-2">No yield pools for this protocol</p>
						</div>
					) : (
						<YieldsPoolsTable data={poolsWithVolatility} />
					)}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}
