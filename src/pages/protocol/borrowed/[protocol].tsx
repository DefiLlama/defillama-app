import { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { tvlOptionsMap } from '~/components/Filters/options'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol, getProtocolMetrics } from '~/containers/ProtocolOverview/queries'
import {
	formatTvlsByChain,
	getProtocolWarningBanners,
	useFetchProtocolAddlChartsData
} from '~/containers/ProtocolOverview/utils'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug } from '~/utils'
import { IProtocolMetadata } from '~/utils/metadata/types'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const EMPTY_OTHER_PROTOCOLS: string[] = []

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

function updateSelectionOnListChange(selected: string[], all: string[]) {
	if (all.length === 0) return []
	if (selected.length === 0) return all
	const next = selected.filter((x) => all.includes(x))
	return next.length > 0 ? next : all
}

function MultiSeriesChartCard({
	title,
	protocolName,
	allSeries,
	seriesLabel,
	dataset,
	charts,
	exportSuffix,
	valueSymbol
}: {
	title: string
	protocolName: string
	allSeries: string[]
	seriesLabel: string
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	exportSuffix: string
	valueSymbol?: string
}) {
	const [selectedSeriesRaw, setSelectedSeriesRaw] = React.useState<string[]>(() => allSeries)
	const selectedSeries = React.useMemo(
		() => updateSelectionOnListChange(selectedSeriesRaw, allSeries),
		[selectedSeriesRaw, allSeries]
	)

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-${slug(exportSuffix)}`
	const exportTitle = `${protocolName} ${title}`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allSeries.length > 1 ? (
					<SelectWithCombobox
						allValues={allSeries}
						selectedValues={selectedSeries}
						setSelectedValues={setSelectedSeriesRaw}
						label={seriesLabel}
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					{...(valueSymbol !== undefined ? { valueSymbol } : {})}
					selectedCharts={new Set(selectedSeries)}
					onReady={handleChartReady}
				/>
			</React.Suspense>
		</div>
	)
}

function TokensBreakdownPieChartCard({
	protocolName,
	chartData
}: {
	protocolName: string
	chartData: Array<{ name: string; value: number }>
}) {
	const allTokens = React.useMemo(() => chartData.map((d) => d.name), [chartData])
	const [selectedTokensRaw, setSelectedTokensRaw] = React.useState<string[]>(() => allTokens)
	const selectedTokens = React.useMemo(
		() => updateSelectionOnListChange(selectedTokensRaw, allTokens),
		[selectedTokensRaw, allTokens]
	)

	const selectedTokensSet = React.useMemo(() => new Set(selectedTokens), [selectedTokens])
	const filteredChartData = React.useMemo(() => {
		if (selectedTokens.length === 0) return []
		return chartData.filter((d) => selectedTokensSet.has(d.name))
	}, [chartData, selectedTokens.length, selectedTokensSet])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	const exportFilenameBase = `${slug(protocolName)}-borrowed-tokens-breakdown-usd`
	const exportTitle = `${protocolName} Borrowed Tokens Breakdown (USD)`

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h1 className="mr-auto text-base font-semibold">Borrowed Tokens Breakdown (USD)</h1>
				{allTokens.length > 1 ? (
					<SelectWithCombobox
						allValues={allTokens}
						selectedValues={selectedTokens}
						setSelectedValues={setSelectedTokensRaw}
						label="Token"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="h-[360px]" />}>
				<PieChart chartData={filteredChartData} onReady={handleChartReady} />
			</React.Suspense>
		</div>
	)
}

export const getStaticProps = withPerformanceLogging(
	'protocol/borrowed/[protocol]',
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

		if (!metadata || !metadata[1].borrowed) {
			return { notFound: true, props: null }
		}

		const protocolData = await getProtocol(protocol)

		if (!protocolData || !protocolData.currentChainTvls?.borrowed) {
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

export default function Protocols(props) {
	const { data: addlProtocolData, historicalChainTvls, isLoading } = useFetchProtocolAddlChartsData(props.name, true)
	const { tokensUnique, tokenBreakdown, tokenBreakdownUSD, tokenBreakdownPieChart } = addlProtocolData || {}

	const { chainsSplit, chainsUnique } = React.useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled: {} })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique: string[] = []
		for (const key in lastEntry) {
			if (!Object.prototype.hasOwnProperty.call(lastEntry, key)) continue
			if (key !== 'date') chainsUnique.push(key)
		}
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls])

	const { borrowedByChainDataset, borrowedByChainCharts } = React.useMemo(() => {
		if (!chainsSplit || chainsUnique.length === 0) {
			return {
				borrowedByChainDataset: null as MultiSeriesChart2Dataset | null,
				borrowedByChainCharts: [] as MultiSeriesCharts
			}
		}

		return {
			borrowedByChainDataset: {
				source: chainsSplit.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...chainsUnique]
			},
			borrowedByChainCharts: chainsUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			})) as MultiSeriesCharts
		}
	}, [chainsSplit, chainsUnique])

	const { tokenRawDataset, tokenRawCharts } = React.useMemo(() => {
		if (!tokenBreakdown?.length || !tokensUnique?.length) {
			return { tokenRawDataset: null as MultiSeriesChart2Dataset | null, tokenRawCharts: [] as MultiSeriesCharts }
		}
		return {
			tokenRawDataset: {
				source: tokenBreakdown.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokensUnique]
			},
			tokenRawCharts: tokensUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			})) as MultiSeriesCharts
		}
	}, [tokenBreakdown, tokensUnique])

	const { tokenUSDDataset, tokenUSDCharts } = React.useMemo(() => {
		if (!tokenBreakdownUSD?.length || !tokensUnique?.length) {
			return { tokenUSDDataset: null as MultiSeriesChart2Dataset | null, tokenUSDCharts: [] as MultiSeriesCharts }
		}
		return {
			tokenUSDDataset: {
				source: tokenBreakdownUSD.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...tokensUnique]
			},
			tokenUSDCharts: tokensUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			})) as MultiSeriesCharts
		}
	}, [tokenBreakdownUSD, tokensUnique])

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
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{borrowedByChainDataset && chainsUnique.length > 1 ? (
						<MultiSeriesChartCard
							key={`${chainsUnique.join('|')}:borrowed-by-chain`}
							title="Borrowed by Chain"
							protocolName={props.name}
							allSeries={chainsUnique}
							seriesLabel="Chain"
							dataset={borrowedByChainDataset}
							charts={borrowedByChainCharts}
							exportSuffix="borrowed-by-chain"
							valueSymbol="$"
						/>
					) : null}

					{tokenUSDDataset && tokensUnique?.length > 0 ? (
						<MultiSeriesChartCard
							key={`${tokensUnique.join('|')}:borrowed-by-token-usd`}
							title="Borrowed by Token (USD)"
							protocolName={props.name}
							allSeries={tokensUnique}
							seriesLabel="Token"
							dataset={tokenUSDDataset}
							charts={tokenUSDCharts}
							exportSuffix="borrowed-by-token-usd"
							valueSymbol="$"
						/>
					) : null}

					{tokenBreakdownPieChart?.length > 0 ? (
						<TokensBreakdownPieChartCard
							key={tokenBreakdownPieChart.map((d) => d.name).join('|')}
							protocolName={props.name}
							chartData={tokenBreakdownPieChart}
						/>
					) : null}

					{tokenRawDataset && tokensUnique?.length > 0 ? (
						<MultiSeriesChartCard
							key={`${tokensUnique.join('|')}:borrowed-by-token-raw`}
							title="Borrowed by Token (Raw Quantities)"
							protocolName={props.name}
							allSeries={tokensUnique}
							seriesLabel="Token"
							dataset={tokenRawDataset}
							charts={tokenRawCharts}
							exportSuffix="borrowed-by-token-raw"
							valueSymbol=""
						/>
					) : null}
				</div>
			)}
		</ProtocolOverviewLayout>
	)
}
