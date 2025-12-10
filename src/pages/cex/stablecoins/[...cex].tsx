import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { maxAgeForNext } from '~/api'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import { IChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { buildStablecoinChartsData } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formattedNum } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart'))

export const getStaticProps = withPerformanceLogging(
	'cex/stablecoins/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const cexs = metadataCache.cexs

		const exchangeData = cexs.find((cex) => cex.slug && cex.slug.toLowerCase() === exchangeName.toLowerCase())
		if (typeof exchangeName !== 'string' || !exchangeData) {
			return {
				notFound: true
			}
		}

		const protocolData = await getProtocol(exchangeName)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics: {
					stablecoins: true,
					tvl: false,
					tvlTab: true,
					dexs: false,
					perps: false,
					openInterest: false,
					optionsPremiumVolume: false,
					optionsNotionalVolume: false,
					dexAggregators: false,
					perpsAggregators: false,
					bridgeAggregators: false,
					bridge: false,
					treasury: false,
					unlocks: false,
					incentives: false,
					yields: false,
					fees: false,
					revenue: false,
					bribes: false,
					tokenTax: false,
					forks: false,
					governance: false,
					nfts: false,
					dev: false,
					inflows: false,
					liquidity: false,
					activeUsers: false
				}
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

function useStablecoinData(protocolName: string) {
	const { data: protocolData, isLoading: isProtocolLoading } = useFetchProtocol(protocolName)
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const { data, isLoading } = useQuery({
		queryKey: ['stablecoin-charts-data', protocolName, JSON.stringify(extraTvlsEnabled)],
		queryFn: async () => {
			if (!protocolData?.chainTvls) return null
			return buildStablecoinChartsData({
				chainTvls: protocolData.chainTvls,
				extraTvlsEnabled
			})
		},
		enabled: !!protocolData?.chainTvls,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	return { data, isLoading: isLoading || isProtocolLoading }
}

export default function CEXStablecoins(props: {
	name: string
	category: string
	otherProtocols: Array<string>
	metrics: IProtocolPageMetrics
}) {
	const { data, isLoading } = useStablecoinData(props.name)

	const currentTotal = React.useMemo(() => {
		if (!data?.totalStablecoins || data.totalStablecoins.length === 0) return null
		return data.totalStablecoins[data.totalStablecoins.length - 1].value
	}, [data])

	const stablecoinBreakdown = React.useMemo(() => {
		if (!data?.stablecoinsByPegMechanism || data.stablecoinsByPegMechanism.length === 0) return null
		const latest = data.stablecoinsByPegMechanism[data.stablecoinsByPegMechanism.length - 1]
		const breakdown: Array<{ mechanism: string; value: number; percentage: number }> = []
		let total = 0

		for (const key in latest) {
			if (key !== 'date') {
				total += latest[key]
			}
		}

		for (const key in latest) {
			if (key !== 'date') {
				breakdown.push({
					mechanism: key,
					value: latest[key],
					percentage: (latest[key] / total) * 100
				})
			}
		}

		return breakdown.sort((a, b) => b.value - a.value)
	}, [data])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="stablecoins"
			isCEX={true}
		>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : !data ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<p className="text-(--text-label)">No stablecoin data available for this exchange</p>
				</div>
			) : (
				<>
					<div className="grid gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-6 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<p className="text-sm text-(--text-label)">Total Stablecoin in CEX</p>
							<p className="mt-1 text-2xl font-bold">{currentTotal ? formattedNum(currentTotal, true) : '-'}</p>
						</div>
						{stablecoinBreakdown && stablecoinBreakdown.length > 0 && (
							<>
								<div>
									<p className="text-sm text-(--text-label)">Dominant Backing Type</p>
									<p className="mt-1 text-2xl font-bold capitalize">
										{stablecoinBreakdown[0].mechanism.replace('-', ' ')}
									</p>
									<p className="text-sm text-(--text-label)">{stablecoinBreakdown[0].percentage.toFixed(1)}%</p>
								</div>
								<div>
									<p className="text-sm text-(--text-label)">Fiat-Backed %</p>
									<p className="mt-1 text-2xl font-bold">
										{stablecoinBreakdown.find((b) => b.mechanism === 'fiat-backed')?.percentage.toFixed(1) || '0'}%
									</p>
								</div>
								<div>
									<p className="text-sm text-(--text-label)">Number of Stablecoins</p>
									<p className="mt-1 text-2xl font-bold">{data.stablecoinTokensUnique?.length || 0}</p>
								</div>
							</>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2">
						{data.totalStablecoins && data.totalStablecoins.length > 1 && (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={data.totalStablecoins.map(({ date, value }) => ({ date, Total: value }))}
										title="Total Stablecoin in CEX"
										customLegendName="Stablecoins"
										customLegendOptions={['Total']}
										valueSymbol="$"
									/>
								</React.Suspense>
							</LazyChart>
						)}

						{data.stablecoinsByPegMechanism && data.stablecoinsByPegMechanism.length > 1 && (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={data.stablecoinsByPegMechanism}
										title="Stablecoins by Backing Type"
										customLegendName="Backing"
										customLegendOptions={data.pegMechanismsUnique}
										valueSymbol="$"
									/>
								</React.Suspense>
							</LazyChart>
						)}

						{data.pegMechanismPieChart && data.pegMechanismPieChart.length > 0 && (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<PieChart title="Distribution by Backing Type" chartData={data.pegMechanismPieChart} />
								</React.Suspense>
							</LazyChart>
						)}

						{data.stablecoinsByPegType && data.stablecoinsByPegType.length > 1 && (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={data.stablecoinsByPegType}
										title="Stablecoins by Currency Peg"
										customLegendName="Currency"
										customLegendOptions={data.pegTypesUnique}
										valueSymbol="$"
									/>
								</React.Suspense>
							</LazyChart>
						)}

						{data.stablecoinsByToken &&
							data.stablecoinsByToken.length > 1 &&
							data.stablecoinTokensUnique &&
							data.stablecoinTokensUnique.length > 0 && (
								<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<AreaChart
											chartData={data.stablecoinsByToken}
											title="Individual Stablecoins"
											customLegendName="Token"
											customLegendOptions={data.stablecoinTokensUnique}
											valueSymbol="$"
										/>
									</React.Suspense>
								</LazyChart>
							)}
					</div>
				</>
			)}
		</ProtocolOverviewLayout>
	)
}
