import type { GetStaticPropsContext } from 'next'
import Router, { useRouter } from 'next/router'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createAggregateTooltipFormatter, createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { TokenLogo } from '~/components/TokenLogo'
import { oldBlue } from '~/constants/colors'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { formatTvlsByChainFromTokens, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug, tokenIconUrl } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface CexAssetsPageProps {
	name: string
	parentProtocol: string | null
	otherProtocols: string[]
	category: string | null
	metrics: Pick<IProtocolPageMetrics, 'tvlTab' | 'stablecoins'>
	ownToken: string | null
}

const INFLOWS_TOOLTIP_FORMATTER_USD = createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })
const AGG_TOOLTIP_FORMATTER_USD = createAggregateTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })

export const getStaticProps = withPerformanceLogging(
	'cex/assets/[cex]',
	async ({ params }: GetStaticPropsContext<{ cex: string }>) => {
		if (!params?.cex) {
			return { notFound: true, props: null }
		}

		const exchangeName = params.cex
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const cexs = metadataCache.cexs

		const exchangeData = cexs.find((cex) => cex.slug && cex.slug.toLowerCase() === exchangeName.toLowerCase())
		if (!exchangeData) {
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

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

function ChainsChartCard({
	protocolName,
	allChains,
	dataset,
	charts
}: {
	protocolName: string
	allChains: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const [selectedChains, setSelectedChains] = React.useState<string[]>(() => allChains)

	const selectedChainsSet = React.useMemo(() => new Set(selectedChains), [selectedChains])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-chains`
	const exportTitle = `${protocolName} Chains`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Chains</h1>
				{allChains.length > 1 ? (
					<SelectWithCombobox
						allValues={allChains}
						selectedValues={selectedChains}
						setSelectedValues={setSelectedChains}
						label="Chain"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol="$"
					selectedCharts={selectedChainsSet}
					chartOptions={{ tooltip: { formatter: AGG_TOOLTIP_FORMATTER_USD } }}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokenValuesUSDChartCard({
	protocolName,
	allTokens,
	dataset,
	charts
}: {
	protocolName: string
	allTokens: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const [selectedTokensUSD, setSelectedTokensUSD] = React.useState<string[]>(() => allTokens)

	const selectedTokensUSDSet = React.useMemo(() => new Set(selectedTokensUSD), [selectedTokensUSD])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-token-values-usd`
	const exportTitle = `${protocolName} Token Values (USD)`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Token Values (USD)</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokensUSD}
						setSelectedValues={setSelectedTokensUSD}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol="$"
					selectedCharts={selectedTokensUSDSet}
					chartOptions={{ tooltip: { formatter: AGG_TOOLTIP_FORMATTER_USD } }}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokensBreakdownPieChartCard({
	chartData,
	protocolName
}: {
	chartData: Array<{ name: string; value: number }>
	protocolName: string
}) {
	const allTokens = React.useMemo(() => chartData.map((d) => d.name), [chartData])
	const [selectedTokens, setSelectedTokens] = React.useState<string[]>(() => allTokens)

	const selectedTokensSet = React.useMemo(() => new Set(selectedTokens), [selectedTokens])

	const filteredChartData = React.useMemo(() => {
		if (selectedTokens.length === 0) return []
		return chartData.filter((d) => selectedTokensSet.has(d.name))
	}, [chartData, selectedTokens.length, selectedTokensSet])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-tokens-breakdown`
	const exportTitle = `${protocolName} Tokens Breakdown`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Tokens Breakdown</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokens}
						setSelectedValues={setSelectedTokens}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<PieChart chartData={filteredChartData} onReady={handleChartReady} />
			</React.Suspense>
		</div>
	)
}

function TokenBalancesRawChartCard({
	protocolName,
	allTokens,
	dataset,
	charts
}: {
	protocolName: string
	allTokens: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const [selectedTokensRaw, setSelectedTokensRaw] = React.useState<string[]>(() => allTokens)

	const selectedTokensRawSet = React.useMemo(() => new Set(selectedTokensRaw), [selectedTokensRaw])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-token-balances-raw`
	const exportTitle = `${protocolName} Token Balances (Raw Quantities)`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Token Balances (Raw Quantities)</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokensRaw}
						setSelectedValues={setSelectedTokensRaw}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol=""
					selectedCharts={selectedTokensRawSet}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function USDInflowsChartCard({ protocolName, dataset }: { protocolName: string; dataset: MultiSeriesChart2Dataset }) {
	const allSeries = React.useMemo(() => ['USD Inflows'], [])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-usd-inflows`
	const exportTitle = `${protocolName} USD Inflows`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">USD Inflows</h1>
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={USD_INFLOWS_CHARTS}
					valueSymbol="$"
					selectedCharts={new Set(allSeries)}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function InflowsByTokenChartCard({
	protocolName,
	allTokens,
	dataset,
	charts
}: {
	protocolName: string
	allTokens: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
}) {
	const [selectedTokenInflows, setSelectedTokenInflows] = React.useState<string[]>(() => allTokens)

	const selectedTokenInflowsSet = React.useMemo(() => new Set(selectedTokenInflows), [selectedTokenInflows])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-inflows-by-token`
	const exportTitle = `${protocolName} Inflows by Token`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Inflows by Token</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokenInflows}
						setSelectedValues={setSelectedTokenInflows}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					hideDefaultLegend={true}
					valueSymbol="$"
					selectedCharts={selectedTokenInflowsSet}
					chartOptions={
						selectedTokenInflowsSet.size > 1 ? { tooltip: { formatter: INFLOWS_TOOLTIP_FORMATTER_USD } } : undefined
					}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

export default function Protocols(props: CexAssetsPageProps) {
	const router = useRouter()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')

	// includeOwnTokens is true by default, unless explicitly set to 'false' in query params
	// Only read query params after router is ready to avoid hydration mismatch
	const includeOwnTokens = !router.isReady || router.query.includeOwnTokens !== 'false'
	const tokenToExclude = !includeOwnTokens ? props.ownToken : null

	const {
		data: addlProtocolData,
		historicalChainTvls,
		isLoading,
		isFetching: _isFetching
	} = useFetchProtocolAddlChartsData(props.name, false, tokenToExclude)
	const {
		usdInflows,
		tokenInflows,
		tokensUnique: rawTokensUnique,
		tokenBreakdown,
		tokenBreakdownUSD,
		tokenBreakdownPieChart
	} = addlProtocolData || {}

	const tokensUnique = React.useMemo(() => rawTokensUnique ?? [], [rawTokensUnique])

	const toggleIncludeOwnTokens = (event: React.ChangeEvent<HTMLInputElement>) => {
		const nextIncludeOwnTokens = event.currentTarget.checked
		const { includeOwnTokens: _inc, ...restQuery } = Router.query
		const nextQuery = nextIncludeOwnTokens ? restQuery : { ...restQuery, includeOwnTokens: 'false' }
		Router.push({ pathname: Router.pathname, query: nextQuery }, undefined, { shallow: true })
	}

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

	const { chainsDataset, chainsCharts } = React.useMemo(() => {
		if (!chainsSplit) return { chainsDataset: null, chainsCharts: [] }
		return {
			chainsDataset: {
				source: chainsSplit.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...chainsUnique]
			},
			chainsCharts: chainsUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [chainsSplit, chainsUnique])

	const { tokenUSDDataset, tokenUSDCharts } = React.useMemo(() => {
		if (!tokenBreakdownUSD?.length || tokenBreakdownUSD.length <= 1)
			return { tokenUSDDataset: null, tokenUSDCharts: [] }
		return {
			tokenUSDDataset: {
				source: tokenBreakdownUSD.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokensUnique]
			},
			tokenUSDCharts: tokensUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [tokenBreakdownUSD, tokensUnique])

	const { tokenRawDataset, tokenRawCharts } = React.useMemo(() => {
		if (!tokenBreakdown?.length || tokenBreakdown.length <= 1) return { tokenRawDataset: null, tokenRawCharts: [] }
		return {
			tokenRawDataset: {
				source: tokenBreakdown.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokensUnique]
			},
			tokenRawCharts: tokensUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [tokenBreakdown, tokensUnique])

	const usdInflowsDataset = React.useMemo(
		() =>
			usdInflows?.length > 0
				? {
						source: usdInflows.map(([d, v]) => ({ timestamp: +d * 1e3, 'USD Inflows': v })),
						dimensions: ['timestamp', 'USD Inflows']
					}
				: null,
		[usdInflows]
	)

	const { tokenInflowsDataset, tokenInflowsCharts } = React.useMemo(() => {
		if (!tokenInflows?.length) return { tokenInflowsDataset: null, tokenInflowsCharts: [] }
		return {
			tokenInflowsDataset: {
				source: tokenInflows.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokensUnique]
			},
			tokenInflowsCharts: tokensUnique.map((name) => ({
				type: 'bar' as const,
				name,
				encode: { x: 'timestamp', y: name },
				// BarChart auto-stacked when `customLegendOptions` was used (no explicit stacks),
				// so keep stacked token inflows behavior in MultiSeriesChart2.
				stack: 'tokenInflows'
			}))
		}
	}, [tokenInflows, tokensUnique])

	return (
		<ProtocolOverviewLayout
			name={props.name}
			category={props.category}
			otherProtocols={props.otherProtocols}
			metrics={props.metrics as IProtocolPageMetrics}
			tab="assets"
			isCEX={true}
		>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			) : (
				<>
					<div className="col-span-full flex items-center justify-end rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<div className="mr-auto flex items-center gap-2">
							<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
							<h1 className="text-xl font-bold">{props.name}</h1>
						</div>

						{props.ownToken ? (
							<Switch
								value="includeOwnTokens"
								label={`Include own tokens (${props.ownToken})`}
								checked={includeOwnTokens}
								onChange={toggleIncludeOwnTokens}
								className="gap-2"
							/>
						) : null}
					</div>
					<div className="grid grid-cols-2 gap-2">
						{chainsDataset && chainsUnique?.length > 1 ? (
							<ChainsChartCard
								key={chainsUnique.join('|')}
								protocolName={props.name}
								allChains={chainsUnique}
								dataset={chainsDataset}
								charts={chainsCharts}
							/>
						) : null}

						{tokenUSDDataset && tokensUnique?.length > 0 ? (
							<TokenValuesUSDChartCard
								key={tokensUnique.join('|')}
								protocolName={props.name}
								allTokens={tokensUnique}
								dataset={tokenUSDDataset}
								charts={tokenUSDCharts}
							/>
						) : null}

						{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && tokenBreakdownPieChart?.length > 0 ? (
							<TokensBreakdownPieChartCard
								key={tokenBreakdownPieChart.map((d) => d.name).join('|')}
								chartData={tokenBreakdownPieChart}
								protocolName={props.name}
							/>
						) : null}

						{tokenRawDataset && tokensUnique?.length > 0 ? (
							<TokenBalancesRawChartCard
								key={tokensUnique.join('|')}
								protocolName={props.name}
								allTokens={tokensUnique}
								dataset={tokenRawDataset}
								charts={tokenRawCharts}
							/>
						) : null}

						{usdInflowsDataset ? <USDInflowsChartCard protocolName={props.name} dataset={usdInflowsDataset} /> : null}

						{tokenInflowsDataset && tokensUnique?.length > 0 ? (
							<InflowsByTokenChartCard
								key={tokensUnique.join('|')}
								protocolName={props.name}
								allTokens={tokensUnique}
								dataset={tokenInflowsDataset}
								charts={tokenInflowsCharts}
							/>
						) : null}
					</div>
				</>
			)}
		</ProtocolOverviewLayout>
	)
}

const USD_INFLOWS_CHARTS = [
	{ type: 'bar' as const, name: 'USD Inflows', encode: { x: 'timestamp', y: 'USD Inflows' }, color: oldBlue }
]
