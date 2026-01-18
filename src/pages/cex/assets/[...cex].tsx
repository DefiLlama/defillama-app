import { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { oldBlue } from '~/constants/colors'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import { formatTvlsByChainFromTokens, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { withPerformanceLogging } from '~/utils/perf'

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
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const cexs = metadataCache.cexs

		// if cex is not string, return 404
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
				metrics: { tvlTab: true, stablecoins: true },
				ownToken: exchangeData.coin ?? null
			},
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Protocols(props) {
	const router = useRouter()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	// includeOwnTokens is true by default, unless explicitly set to 'false' in query params
	// Only read query params after router is ready to avoid hydration mismatch
	const includeOwnTokens = !router.isReady || router.query.includeOwnTokens !== 'false'
	const tokenToExclude = !includeOwnTokens ? props.ownToken : null

	const {
		data: addlProtocolData,
		historicalChainTvls,
		isLoading
	} = useFetchProtocolAddlChartsData(props.name, false, tokenToExclude)
	const {
		usdInflows,
		tokenInflows,
		tokensUnique: rawTokensUnique,
		tokenBreakdown,
		tokenBreakdownUSD,
		tokenBreakdownPieChart
	} = addlProtocolData || {}

	const tokensUnique = rawTokensUnique ?? []

	// Key to force chart remount when toggle changes, resetting internal selection state
	const chartKey = includeOwnTokens ? 'with-own-token' : 'without-own-token'

	const toggleIncludeOwnTokens = React.useCallback(() => {
		const { cex: _cex, includeOwnTokens: _inc, ...restQuery } = router.query
		const nextQuery = includeOwnTokens ? { ...restQuery, includeOwnTokens: 'false' } : restQuery
		router.push({ pathname: router.asPath.split('?')[0], query: nextQuery }, undefined, { shallow: true })
	}, [router, includeOwnTokens])

	const { chainsSplit, chainsUnique } = React.useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		// For CEX, calculate TVL by chain from tokensInUsd (summing all token values per chain)
		// This also respects the tokenToExclude filter
		const chainsSplit = formatTvlsByChainFromTokens({ historicalChainTvls, extraTvlsEnabled, tokenToExclude })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique: string[] = []
		for (const key in lastEntry) {
			if (key !== 'date') chainsUnique.push(key)
		}
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled, tokenToExclude])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics}
			tab="assets"
			isCEX={true}
		>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : (
				<>
					{props.ownToken && (
						<div className="col-span-full rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
							<label className="flex cursor-pointer flex-nowrap items-center justify-end gap-2">
								<input
									type="checkbox"
									checked={includeOwnTokens}
									onChange={toggleIncludeOwnTokens}
									className="h-4 w-4 cursor-pointer"
								/>
								<span className="text-sm">Include own tokens ({props.ownToken})</span>
							</label>
						</div>
					)}
					<div className="grid grid-cols-2 gap-2">
						{chainsSplit && chainsUnique?.length > 1 && (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
							<LazyChart
								key={`token-usd-${chartKey}`}
								className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full"
							>
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
						)}

						{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && tokenBreakdownPieChart?.length > 0 && (
							<LazyChart
								key={`token-pie-${chartKey}`}
								className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full"
							>
								<React.Suspense fallback={<></>}>
									<PieChart title="Tokens Breakdown" chartData={tokenBreakdownPieChart} />
								</React.Suspense>
							</LazyChart>
						)}

						{tokenBreakdown?.length > 1 && tokensUnique?.length > 0 && (
							<LazyChart
								key={`token-raw-${chartKey}`}
								className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full"
							>
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
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<React.Suspense fallback={<></>}>
									<BarChart chartData={usdInflows} color={oldBlue} title="USD Inflows" valueSymbol="$" />
								</React.Suspense>
							</LazyChart>
						)}
						{tokenInflows?.length > 0 && tokensUnique?.length > 0 && (
							<LazyChart
								key={`token-inflows-${chartKey}`}
								className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full"
							>
								<React.Suspense fallback={<></>}>
									<BarChart
										chartData={tokenInflows}
										title="Inflows by Token"
										customLegendName="Token"
										customLegendOptions={tokensUnique}
										hideDefaultLegend={true}
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
