import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { LazyChart } from '~/components/LazyChart'
import { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { formatTvlsByChain, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { cexData } from '~/pages/cexs'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export const getStaticProps = withPerformanceLogging(
	'cex/assets/[...cex]',
	async ({
		params: {
			cex: [exchangeName]
		}
	}) => {
		// if cex is not string, return 404
		const exchangeData = cexData.find((cex) => cex.slug.toLowerCase() === exchangeName.toLowerCase())
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
				metrics: { tvlTab: true }
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	const { data: addlProtocolData, historicalChainTvls, isLoading } = useFetchProtocolAddlChartsData(props.name)
	const { usdInflows, tokenInflows, tokensUnique, tokenBreakdown, tokenBreakdownUSD, tokenBreakdownPieChart } =
		addlProtocolData || {}
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	const { chainsSplit, chainsUnique } = React.useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
		const chainsUnique = Object.keys(chainsSplit[chainsSplit.length - 1] ?? {}).filter((c) => c !== 'date')
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="assets"
			isCEX={true}
		>
			<div className="grid grid-cols-2 bg-(--cards-bg) border border-(--cards-border) rounded-md pt-2">
				{isLoading ? (
					<p className="flex items-center justify-center text-center h-[400px] col-span-full">Loading...</p>
				) : (
					<>
						{chainsSplit && chainsUnique?.length > 1 && (
							<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={chainsSplit}
										title="Chains"
										customLegendName="Chain"
										customLegendOptions={chainsUnique}
										valueSymbol="$"
									/>
								</React.Suspense>
							</LazyChart>
						)}

						{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && (
							<>
								<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<AreaChart
											chartData={tokenBreakdownUSD}
											title="Token Values (USD)"
											customLegendName="Token"
											customLegendOptions={tokensUnique}
											valueSymbol="$"
										/>
									</React.Suspense>
								</LazyChart>
							</>
						)}

						{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && (
							<>
								{tokenBreakdownPieChart?.length > 0 && (
									<LazyChart className="pt-10 relative col-span-full min-h-[440px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
										<React.Suspense fallback={<></>}>
											<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
										</React.Suspense>
									</LazyChart>
								)}
							</>
						)}

						{tokenBreakdown?.length > 1 && tokensUnique?.length > 0 && (
							<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={tokenBreakdown}
										title="Token Balances (Raw Quantities)"
										customLegendName="Token"
										customLegendOptions={tokensUnique}
									/>
								</React.Suspense>
							</LazyChart>
						)}

						{usdInflows?.length > 0 && (
							<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<BarChart chartData={usdInflows} color={props.backgroundColor} title="USD Inflows" valueSymbol="$" />
								</React.Suspense>
							</LazyChart>
						)}
						{tokenInflows?.length > 0 && tokensUnique?.length > 0 && (
							<LazyChart className="relative col-span-full min-h-[400px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<BarChart
										chartData={tokenInflows}
										title="Token Inflows"
										customLegendName="Token"
										customLegendOptions={tokensUnique}
										hideDefaultLegend={true}
										valueSymbol="$"
									/>
								</React.Suspense>
							</LazyChart>
						)}
					</>
				)}
			</div>
		</ProtocolOverviewLayout>
	)
}
