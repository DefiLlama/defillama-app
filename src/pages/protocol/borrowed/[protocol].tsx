import type { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { tvlOptionsMap } from '~/components/Filters/options'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TokenLogo } from '~/components/TokenLogo'
import { fetchProtocolOverviewMetrics } from '~/containers/ProtocolOverview/api'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocolMetricFlags } from '~/containers/ProtocolOverview/queries'
import { useProtocolBreakdownCharts } from '~/containers/ProtocolOverview/useProtocolBreakdownCharts'
import { getProtocolWarningBanners } from '~/containers/ProtocolOverview/utils'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { slug, tokenIconUrl } from '~/utils'
import type { IProtocolMetadata } from '~/utils/metadata/types'
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
				<h2 className="mr-auto text-base font-semibold">{title}</h2>
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
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
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
				<h2 className="mr-auto text-base font-semibold">Borrowed Tokens Breakdown (USD)</h2>
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
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
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

		const protocolData = await fetchProtocolOverviewMetrics(protocol)

		if (!protocolData || !protocolData.currentChainTvls?.borrowed) {
			return { notFound: true, props: null }
		}

		const metrics = getProtocolMetricFlags({ protocolData, metadata: metadata[1] })

		const toggleOptions = []

		for (const chain in protocolData.currentChainTvls) {
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
	const protocol = slug(props.name ?? '')
	const {
		isLoading,
		chainsUnique,
		tokensUnique,
		chainsDataset: borrowedByChainDataset,
		chainsCharts: borrowedByChainCharts,
		tokenUSDDataset,
		tokenUSDCharts,
		tokenRawDataset,
		tokenRawCharts,
		tokenBreakdownPieChart
	} = useProtocolBreakdownCharts({
		protocol,
		keys: ['borrowed'],
		includeBase: false
	})
	const hasBreakdownMetrics =
		(borrowedByChainDataset && chainsUnique.length > 1) ||
		(tokenUSDDataset && tokensUnique?.length > 0) ||
		(tokenBreakdownPieChart?.length ?? 0) > 0 ||
		(tokenRawDataset && tokensUnique?.length > 0)

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
			<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
				<h1 className="text-xl font-bold">{props.name} Borrowed TVL</h1>
			</div>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			) : !hasBreakdownMetrics ? (
				<div className="col-span-full flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<p className="text-(--text-label)">Breakdown metrics are not available</p>
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
