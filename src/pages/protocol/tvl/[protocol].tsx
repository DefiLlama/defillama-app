import { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { createAggregateTooltipFormatter, createInflowsTooltipFormatter } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { tvlOptionsMap } from '~/components/Filters/options'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TokenLogo } from '~/components/TokenLogo'
import { oldBlue } from '~/constants/colors'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import {
	formatTvlsByChain,
	getProtocolWarningBanners,
	useFetchProtocolAddlChartsData
} from '~/containers/ProtocolOverview/utils'
import { TVL_SETTINGS_KEYS_SET, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug, tokenIconUrl } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const EMPTY_OTHER_PROTOCOLS: string[] = []

const INFLOWS_TOOLTIP_FORMATTER_USD = createInflowsTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })
const AGG_TOOLTIP_FORMATTER_USD = createAggregateTooltipFormatter({ groupBy: 'daily', valueSymbol: '$' })

export const getStaticProps = withPerformanceLogging(
	'protocol/tvl/[protocol]',
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

		if (!metadata || !metadata[1].tvl) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetrics({ protocolData, metadata: metadata[1] })

		const toggleOptions = []

		for (const chain in protocolData.chainTvls) {
			if (TVL_SETTINGS_KEYS_SET.has(chain)) {
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
				otherProtocols: protocolData.otherProtocols ?? EMPTY_OTHER_PROTOCOLS,
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

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

function ChainsChartCard({
	title,
	allValues,
	dataset,
	charts,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	allValues: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	exportFilenameBase: string
	exportTitle: string
}) {
	const [selected, setSelected] = React.useState<string[]>(() => allValues)

	const selectedChartsSet = React.useMemo(() => new Set(selected), [selected])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allValues.length > 1 ? (
					<SelectWithCombobox
						allValues={allValues}
						selectedValues={selected}
						setSelectedValues={setSelected}
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
					selectedCharts={selectedChartsSet}
					chartOptions={{ tooltip: { formatter: AGG_TOOLTIP_FORMATTER_USD } }}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokenLineChartCard({
	title,
	allValues,
	dataset,
	charts,
	valueSymbol,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	allValues: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	valueSymbol?: string
	exportFilenameBase: string
	exportTitle: string
}) {
	const [selected, setSelected] = React.useState<string[]>(() => allValues)

	const selectedChartsSet = React.useMemo(() => new Set(selected), [selected])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allValues.length > 1 ? (
					<SelectWithCombobox
						allValues={allValues}
						selectedValues={selected}
						setSelectedValues={setSelected}
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
					valueSymbol={valueSymbol}
					selectedCharts={selectedChartsSet}
					chartOptions={valueSymbol === '$' ? { tooltip: { formatter: AGG_TOOLTIP_FORMATTER_USD } } : undefined}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokensBreakdownPieChartCard({
	title,
	chartData,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	chartData: Array<{ name: string; value: number }>
	exportFilenameBase: string
	exportTitle: string
}) {
	const allTokens = React.useMemo(() => chartData.map((d) => d.name), [chartData])
	const [selectedTokens, setSelectedTokens] = React.useState<string[]>(allTokens)
	const selectedTokensSet = React.useMemo(() => new Set(selectedTokens), [selectedTokens])

	const filteredChartData = React.useMemo(() => {
		if (selectedTokens.length === 0) return []
		return chartData.filter((d) => selectedTokensSet.has(d.name))
	}, [chartData, selectedTokens.length, selectedTokensSet])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
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

function USDInflowsChartCard({
	title,
	dataset,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	dataset: MultiSeriesChart2Dataset
	exportFilenameBase: string
	exportTitle: string
}) {
	const allSeries = React.useMemo(() => ['USD Inflows'], [])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
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
	title,
	allValues,
	dataset,
	charts,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	allValues: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	exportFilenameBase: string
	exportTitle: string
}) {
	const [selected, setSelected] = React.useState<string[]>(allValues)

	const selectedChartsSet = React.useMemo(() => new Set(selected), [selected])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allValues.length > 1 ? (
					<SelectWithCombobox
						allValues={allValues}
						selectedValues={selected}
						setSelectedValues={setSelected}
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
					selectedCharts={selectedChartsSet}
					chartOptions={
						selectedChartsSet.size > 1 ? { tooltip: { formatter: INFLOWS_TOOLTIP_FORMATTER_USD } } : undefined
					}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

export default function Protocols(props) {
	const {
		data: addlProtocolData,
		historicalChainTvls,
		isLoading,
		isFetching: _isFetching
	} = useFetchProtocolAddlChartsData(props.name)
	const {
		usdInflows,
		tokenInflows,
		tokensUnique: rawTokensUnique,
		tokenBreakdown,
		tokenBreakdownUSD,
		tokenBreakdownPieChart
	} = addlProtocolData || {}
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')
	const tokensUnique = React.useMemo(() => rawTokensUnique ?? [], [rawTokensUnique])

	const { chainsSplit, chainsUnique } = React.useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique: string[] = []
		for (const key in lastEntry) {
			if (!Object.prototype.hasOwnProperty.call(lastEntry, key)) continue
			if (key !== 'date') chainsUnique.push(key)
		}
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled])
	const protocolSlug = slug(props.name || 'protocol')
	const buildFilename = (suffix: string) => `${protocolSlug}-${slug(suffix)}`
	const buildTitle = (suffix: string) => (props.name ? `${props.name} – ${suffix}` : suffix)

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
			metrics={props.metrics}
			tab="tvl"
			warningBanners={props.warningBanners}
			toggleOptions={props.toggleOptions}
		>
			<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
				<h1 className="text-xl font-bold">{props.name} TVL Breakdown</h1>
			</div>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{chainsDataset && chainsUnique?.length > 1 ? (
						<ChainsChartCard
							key={chainsUnique.join('|')}
							title="TVL by Chain"
							allValues={chainsUnique}
							dataset={chainsDataset}
							charts={chainsCharts}
							exportFilenameBase={buildFilename('chains')}
							exportTitle={buildTitle('Chains')}
						/>
					) : null}

					{tokenUSDDataset && tokensUnique?.length > 0 ? (
						<TokenLineChartCard
							key={tokensUnique.join('|')}
							title="Token Values (USD)"
							allValues={tokensUnique}
							dataset={tokenUSDDataset}
							charts={tokenUSDCharts}
							valueSymbol="$"
							exportFilenameBase={buildFilename('token-values-usd')}
							exportTitle={buildTitle('Token Values (USD)')}
						/>
					) : null}

					{tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0 && tokenBreakdownPieChart?.length > 0 ? (
						<TokensBreakdownPieChartCard
							key={tokenBreakdownPieChart.map((d) => d.name).join('|')}
							title="Tokens Breakdown (USD)"
							chartData={tokenBreakdownPieChart}
							exportFilenameBase={buildFilename('tokens-breakdown-usd')}
							exportTitle={buildTitle('Tokens Breakdown (USD)')}
						/>
					) : null}

					{tokenRawDataset && tokensUnique?.length > 0 ? (
						<TokenLineChartCard
							key={`${tokensUnique.join('|')}:raw`}
							title="Token Balances (Raw Quantities)"
							allValues={tokensUnique}
							dataset={tokenRawDataset}
							charts={tokenRawCharts}
							valueSymbol=""
							exportFilenameBase={buildFilename('token-balances')}
							exportTitle={buildTitle('Token Balances (Raw Quantities)')}
						/>
					) : null}

					{usdInflowsDataset ? (
						<USDInflowsChartCard
							title="USD Inflows"
							dataset={usdInflowsDataset}
							exportFilenameBase={buildFilename('usd-inflows')}
							exportTitle={buildTitle('USD Inflows')}
						/>
					) : null}

					{tokenInflowsDataset && tokensUnique?.length > 0 ? (
						<InflowsByTokenChartCard
							key={tokensUnique.join('|')}
							title="Inflows by Token"
							allValues={tokensUnique}
							dataset={tokenInflowsDataset}
							charts={tokenInflowsCharts}
							exportFilenameBase={buildFilename('inflows-by-token')}
							exportTitle={buildTitle('Inflows by Token')}
						/>
					) : null}
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}

const USD_INFLOWS_CHARTS = [
	{ type: 'bar' as const, name: 'USD Inflows', encode: { x: 'timestamp', y: 'USD Inflows' }, color: oldBlue }
]
