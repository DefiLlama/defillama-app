import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { buildProtocolAddlChartsData, getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PROTOCOL_TREASURY_API } from '~/constants'
import { fetchJson } from '~/utils/async'
import { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export const getStaticProps = withPerformanceLogging(
	'protocol/treasury[...protocol]',
	async ({
		params: {
			protocol: [protocol]
		}
	}) => {
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

		if (!metadata || !metadata[1].treasury) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				otherProtocols: protocolData?.otherProtocols ?? [],
				category: protocolData?.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData)
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	const [includeOwnTokens, setIncludeOwnTokens] = useState(true)
	const { data, isLoading } = useQuery({
		queryKey: ['treasury', props.name],
		queryFn: () => fetchJson(`${PROTOCOL_TREASURY_API}/${props.name}`),
		staleTime: 60 * 60 * 1000,
		retry: 0
	})

	const { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury } = useMemo(() => {
		const chartData = {}
		const allLatestTokensInUsd = {}
		for (const chain in data?.chainTvls ?? {}) {
			if (chain.includes('-')) continue
			if (!includeOwnTokens && chain.endsWith('OwnTokens')) continue
			chartData[chain] = data.chainTvls[chain]
			const latestTokensInUsd = data.chainTvls[chain].tokensInUsd.slice(-1)[0].tokens
			for (const token in latestTokensInUsd) {
				allLatestTokensInUsd[token] = (allLatestTokensInUsd[token] || 0) + latestTokensInUsd[token]
			}
		}

		const [topTokens, others] = Object.entries(allLatestTokensInUsd)
			.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
			.map(([token, value]) => ({ name: token, value: value as number }))
			.reduce(
				(acc, curr) => {
					if (acc[0].length < 9) {
						acc[0].push(curr)
					} else {
						acc[1] += curr.value
					}

					return acc
				},
				[[] as { name: string; value: number }[], 0]
			)

		const top10Tokens = [...topTokens, { name: 'Others', value: others }]

		const { tokenBreakdown, tokenBreakdownUSD, tokensUnique } = buildProtocolAddlChartsData({
			protocolData: { name: props.name, chainTvls: chartData },
			extraTvlsEnabled: {}
		})

		const historicalTreasury = {}
		for (const chain in chartData) {
			for (const { date, totalLiquidityUSD } of chartData[chain].tvl) {
				historicalTreasury[date] = (historicalTreasury[date] || 0) + totalLiquidityUSD
			}
		}

		const finalHistoricalTreasury = []
		for (const date in historicalTreasury) {
			finalHistoricalTreasury.push([date, historicalTreasury[date]])
		}

		return { tokenBreakdown, tokenBreakdownUSD, tokensUnique, top10Tokens, historicalTreasury: finalHistoricalTreasury }
	}, [data, includeOwnTokens])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="treasury"
			warningBanners={props.warningBanners}
			toggleOptions={[]}
		>
			<div className="flex flex-wrap justify-between items-center gap-2 bg-(--cards-bg) border border-(--cards-border) rounded-md p-2">
				<h2 className="relative group text-base font-semibold flex items-center gap-1" id="treasury">
					Treasury for {props.name}
				</h2>
				<label className="flex flex-nowrap gap-2 items-center justify-end cursor-pointe ml-auto">
					<input type="checkbox" checked={includeOwnTokens} onChange={() => setIncludeOwnTokens(!includeOwnTokens)} />
					<span>Include own tokens</span>
				</label>
			</div>
			{isLoading ? (
				<p className="flex items-center justify-center text-center min-h-[384px] p-2">Loading...</p>
			) : (
				<div className="grid grid-cols-2 rounded-md min-h-[384px] gap-2">
					<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<PieChart chartData={top10Tokens} />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={historicalTreasury} title="Historical Treasury" valueSymbol="$" />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={tokenBreakdown} title="Tokens Breakdown" stacks={tokensUnique} />
						</Suspense>
					</LazyChart>
					<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
						<Suspense fallback={<></>}>
							<AreaChart chartData={tokenBreakdownUSD} title="Tokens (USD)" stacks={tokensUnique} valueSymbol="$" />
						</Suspense>
					</LazyChart>
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
