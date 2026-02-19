import { useQuery } from '@tanstack/react-query'
import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { SKIP_BUILD_STATIC_GENERATION, YIELD_POOLS_API } from '~/constants'
import { LocalLoader } from '~/components/Loaders'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { useVolatility } from '~/containers/Yields/queries/client'
import { getYieldPageData } from '~/containers/Yields/queries/index'
import { YieldsPoolsTable } from '~/containers/Yields/Tables/Pools'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import { sluggifyProtocol } from '~/utils/cache-client'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const EMPTY_TOGGLE_OPTIONS = []

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

		const [protocolData, yields] = await Promise.all([
			fetchProtocolOverviewMetrics(protocol),
			fetchJson(YIELD_POOLS_API).catch((err) => {
				console.log('[HTTP]:[ERROR]:[PROTOCOL_YIELD]:', protocol, err instanceof Error ? err.message : '')
				return {}
			})
		])

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

		const otherProtocols = protocolData?.otherProtocols?.map((p) => slug(p)) ?? []

		const projectYields = yields?.data?.filter(
			({ project, apy }) =>
				(project === slug(metadata[1].displayName) ||
					(protocolData.parentProtocol ? false : otherProtocols.includes(project))) &&
				apy != 0
		)

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics,
				yields:
					yields && yields.data && projectYields.length > 0
						? {
								noOfPoolsTracked: projectYields.length,
								averageAPY: projectYields.reduce((acc, { apy }) => acc + apy, 0) / projectYields.length
							}
						: null,
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
	const protocolSlug = slug(props.name)
	const { data: volatility } = useVolatility()
	const otherProtocolsSet = React.useMemo(
		() => new Set((props.otherProtocols ?? []).map((op) => sluggifyProtocol(op))),
		[props.otherProtocols]
	)

	const {
		data: poolsList,
		isLoading,
		error
	} = useQuery({
		queryKey: ['yields-pools-list', protocolSlug],
		queryFn: () =>
			getYieldPageData().then(
				(res) =>
					res?.props?.pools
						?.filter((p) => p.project === protocolSlug || (props.parentProtocol ? false : otherProtocolsSet.has(p.project)))
						.map((i) => ({
							...i,
							tvl: i.tvlUsd,
							pool: i.symbol,
							configID: i.pool,
							chains: [i.chain],
							project: i.projectName,
							projectslug: i.project
						})) ?? null
			),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const poolsWithVolatility = React.useMemo(() => {
		if (!poolsList) return poolsList
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

					{isLoading ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<LocalLoader />
						</div>
					) : !poolsList ? (
						<div className="flex flex-1 flex-col items-center justify-center">
							<p className="p-2">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
						</div>
					) : (
						<YieldsPoolsTable data={poolsWithVolatility ?? []} />
					)}
				</div>
			</div>
		</ProtocolOverviewLayout>
	)
}
