import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { tvlOptionsMap } from '~/components/Filters/options'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import { IProtocolMetadata } from '~/containers/ProtocolOverview/types'
import {
	formatTvlsByChain,
	getProtocolWarningBanners,
	useFetchProtocolAddlChartsData
} from '~/containers/ProtocolOverview/utils'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

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

		if (!protocolData || !protocolData.currentChainTvls?.borrowed) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const toggleOptions = []

		for (const chain in protocolData.chainTvls) {
			if (DEFI_SETTINGS_KEYS.includes(chain)) {
				const option = tvlOptionsMap.get(chain as any)
				if (option) {
					toggleOptions.push(option)
				}
			}
		}

		return {
			props: {
				name: protocolData.name,
				parentProtocol: protocolData.parentProtocol ?? null,
				otherProtocols: protocolData.otherProtocols ?? [],
				category: protocolData.category ?? null,
				metrics,
				warningBanners: getProtocolWarningBanners(protocolData),
				toggleOptions
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	const { data: addlProtocolData, historicalChainTvls, isLoading } = useFetchProtocolAddlChartsData(props.name, true)
	const { tokensUnique, tokenBreakdown, tokenBreakdownUSD, tokenBreakdownPieChart } = addlProtocolData || {}

	const { chainsSplit, chainsUnique } = React.useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled: {} })
		const chainsUnique = Object.keys(chainsSplit[chainsSplit.length - 1] ?? {}).filter((c) => c !== 'date')
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="borrowed"
			warningBanners={props.warningBanners}
			toggleOptions={props.toggleOptions}
		>
			{isLoading ? (
				<div className="flex h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : (
				<div className="grid min-h-[408px] grid-cols-2 gap-2 rounded-md">
					{chainsSplit && chainsUnique?.length > 1 && (
						<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<React.Suspense fallback={<></>}>
								<AreaChart
									chartData={chainsSplit}
									title="Borrowed by Chain"
									customLegendName="Chain"
									customLegendOptions={chainsUnique}
									valueSymbol="$"
								/>
							</React.Suspense>
						</LazyChart>
					)}

					{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && (
						<>
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<AreaChart
										chartData={tokenBreakdownUSD}
										title="Borrowed by Token (USD)"
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
								<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<React.Suspense fallback={<></>}>
										<PieChart title="Borrowed Tokens Breakdown (USD)" chartData={tokenBreakdownPieChart} />
									</React.Suspense>
								</LazyChart>
							)}
						</>
					)}

					{tokenBreakdown?.length > 1 && tokensUnique?.length > 0 && (
						<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<React.Suspense fallback={<></>}>
								<AreaChart
									chartData={tokenBreakdown}
									title="Borrowed by Token (Raw Quantities)"
									customLegendName="Token"
									customLegendOptions={tokensUnique}
								/>
							</React.Suspense>
						</LazyChart>
					)}
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
