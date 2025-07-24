import * as React from 'react'
import { withPerformanceLogging } from '~/utils/perf'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import { LazyChart } from '~/components/LazyChart'
import { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import {
	formatTvlsByChain,
	getProtocolWarningBanners,
	useFetchProtocolAddlChartsData
} from '~/containers/ProtocolOverview/utils'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { maxAgeForNext } from '~/api'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export const getStaticProps = withPerformanceLogging(
	'protocol/tvl/[...protocol]',
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

		if (!metadata || !metadata[1].tvl) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
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
			tab="tvl"
			warningBanners={props.warningBanners}
		>
			{isLoading ? (
				<p className="flex items-center justify-center text-center min-h-[384px] bg-(--cards-bg) border border-(--cards-border) rounded-md  p-2">
					Loading...
				</p>
			) : (
				<div className="grid grid-cols-2 rounded-md min-h-[384px] gap-2">
					{chainsSplit && chainsUnique?.length > 1 && (
						<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
							<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
								<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
									</React.Suspense>
								</LazyChart>
							)}
						</>
					)}

					{tokenBreakdown?.length > 1 && tokensUnique?.length > 0 && (
						<LazyChart className="relative col-span-full min-h-[368px] pt-2 bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
						<LazyChart className="relative col-span-full min-h-[412px] bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<React.Suspense fallback={<></>}>
								<BarChart chartData={usdInflows} color={props.backgroundColor} title="USD Inflows" valueSymbol="$" />
							</React.Suspense>
						</LazyChart>
					)}

					{tokenInflows?.length > 0 && tokensUnique?.length > 0 && (
						<LazyChart className="relative col-span-full min-h-[412px] bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
