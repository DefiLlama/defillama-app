import { useQuery } from '@tanstack/react-query'
import type * as echarts from 'echarts/core'
import type { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { useFetchProtocol } from '~/api/categories/protocols/client'
import { ChartCsvExportButton } from '~/components/ButtonStyled/ChartCsvExportButton'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import { getProtocol } from '~/containers/ProtocolOverview/queries'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import { buildStablecoinChartsData } from '~/containers/ProtocolOverview/utils'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { useChartCsvExport } from '~/hooks/useChartCsvExport'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import { formattedNum, slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const PieChart = React.lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const EMPTY_OTHER_PROTOCOLS: string[] = []

export const getStaticProps = withPerformanceLogging(
	'cex/stablecoins/[cex]',
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
				otherProtocols: protocolData.otherProtocols ?? EMPTY_OTHER_PROTOCOLS,
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

type MultiSeriesCharts = NonNullable<IMultiSeriesChart2Props['charts']>

function MultiSeriesChartCard({
	title,
	filterLabel,
	allValues,
	dataset,
	charts,
	valueSymbol,
	hideDefaultLegend,
	exportFilenameBase,
	exportTitle
}: {
	title: string
	filterLabel: string
	allValues: string[]
	dataset: MultiSeriesChart2Dataset
	charts: MultiSeriesCharts
	valueSymbol?: string
	hideDefaultLegend?: boolean
	exportFilenameBase: string
	exportTitle: string
}) {
	const [selected, setSelected] = React.useState<string[]>(allValues)

	const { chartInstance: imageChartInstance, handleChartReady: handleImageReady } = useChartImageExport()
	const { chartInstance: csvChartInstance, handleChartReady: handleCsvReady } = useChartCsvExport()
	const handleReady = React.useCallback(
		(instance: echarts.ECharts | null) => {
			handleImageReady(instance)
			handleCsvReady(instance)
		},
		[handleImageReady, handleCsvReady]
	)

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allValues.length > 1 ? (
					<SelectWithCombobox
						allValues={allValues}
						selectedValues={selected}
						setSelectedValues={setSelected}
						label={filterLabel}
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartCsvExportButton chartInstance={csvChartInstance} filename={exportFilenameBase} />
				<ChartExportButton chartInstance={imageChartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol={valueSymbol}
					hideDefaultLegend={hideDefaultLegend}
					selectedCharts={new Set(selected)}
					onReady={handleReady}
				/>
			</React.Suspense>
		</div>
	)
}

function PieChartCard({
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
	const allValues = React.useMemo(() => chartData.map((d) => d.name), [chartData])
	const [selectedValues, setSelectedValues] = React.useState<string[]>(allValues)
	const selectedValuesSet = React.useMemo(() => new Set(selectedValues), [selectedValues])

	const filteredChartData = React.useMemo(() => {
		if (selectedValues.length === 0) return []
		return chartData.filter((d) => selectedValuesSet.has(d.name))
	}, [chartData, selectedValues.length, selectedValuesSet])

	const { chartInstance: imageChartInstance, handleChartReady: handleImageReady } = useChartImageExport()
	const { chartInstance: csvChartInstance, handleChartReady: handleCsvReady } = useChartCsvExport()
	const handleReady = React.useCallback(
		(instance: echarts.ECharts | null) => {
			handleImageReady(instance)
			handleCsvReady(instance)
		},
		[handleImageReady, handleCsvReady]
	)

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2">
				<h1 className="mr-auto text-base font-semibold">{title}</h1>
				{allValues.length > 1 ? (
					<SelectWithCombobox
						allValues={allValues}
						selectedValues={selectedValues}
						setSelectedValues={setSelectedValues}
						label="Backing"
						labelType="smol"
						variant="filter"
						portal
					/>
				) : null}
				<ChartCsvExportButton chartInstance={csvChartInstance} filename={exportFilenameBase} />
				<ChartExportButton chartInstance={imageChartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="h-[360px]" />}>
				<PieChart chartData={filteredChartData} onReady={handleReady} />
			</React.Suspense>
		</div>
	)
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

	const exchangeSlug = slug(props.name || 'cex')
	const buildFilename = (suffix: string) => `${exchangeSlug}-${slug(suffix)}`
	const buildTitle = (suffix: string) => (props.name ? `${props.name} – ${suffix}` : suffix)

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

	const pegMechanismsUnique = React.useMemo(() => data?.pegMechanismsUnique ?? [], [data?.pegMechanismsUnique])
	const pegTypesUnique = React.useMemo(() => data?.pegTypesUnique ?? [], [data?.pegTypesUnique])
	const stablecoinTokensUnique = React.useMemo(() => data?.stablecoinTokensUnique ?? [], [data?.stablecoinTokensUnique])

	const totalStablecoinsDataset = React.useMemo(() => {
		if (!data?.totalStablecoins?.length || data.totalStablecoins.length <= 1) return null
		return {
			source: data.totalStablecoins.map(({ date, value }) => ({ timestamp: +date * 1e3, Total: value })),
			dimensions: ['timestamp', 'Total']
		}
	}, [data?.totalStablecoins])
	const totalStablecoinsCharts = React.useMemo<MultiSeriesCharts>(
		() => [{ type: 'line' as const, name: 'Total', encode: { x: 'timestamp', y: 'Total' } }],
		[]
	)

	const { stablecoinsByPegMechanismDataset, stablecoinsByPegMechanismCharts } = React.useMemo(() => {
		if (!data?.stablecoinsByPegMechanism?.length || data.stablecoinsByPegMechanism.length <= 1) {
			return { stablecoinsByPegMechanismDataset: null, stablecoinsByPegMechanismCharts: [] }
		}

		return {
			stablecoinsByPegMechanismDataset: {
				source: data.stablecoinsByPegMechanism.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...pegMechanismsUnique]
			},
			stablecoinsByPegMechanismCharts: pegMechanismsUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [data?.stablecoinsByPegMechanism, pegMechanismsUnique])

	const { stablecoinsByPegTypeDataset, stablecoinsByPegTypeCharts } = React.useMemo(() => {
		if (!data?.stablecoinsByPegType?.length || data.stablecoinsByPegType.length <= 1) {
			return { stablecoinsByPegTypeDataset: null, stablecoinsByPegTypeCharts: [] }
		}

		return {
			stablecoinsByPegTypeDataset: {
				source: data.stablecoinsByPegType.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...pegTypesUnique]
			},
			stablecoinsByPegTypeCharts: pegTypesUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [data?.stablecoinsByPegType, pegTypesUnique])

	const { stablecoinsByTokenDataset, stablecoinsByTokenCharts } = React.useMemo(() => {
		if (!data?.stablecoinsByToken?.length || data.stablecoinsByToken.length <= 1) {
			return { stablecoinsByTokenDataset: null, stablecoinsByTokenCharts: [] }
		}

		return {
			stablecoinsByTokenDataset: {
				source: data.stablecoinsByToken.map(({ date, ...rest }) => ({ timestamp: +date * 1e3, ...rest })),
				dimensions: ['timestamp', ...stablecoinTokensUnique]
			},
			stablecoinsByTokenCharts: stablecoinTokensUnique.map((name) => ({
				type: 'line' as const,
				name,
				encode: { x: 'timestamp', y: name }
			}))
		}
	}, [data?.stablecoinsByToken, stablecoinTokensUnique])

	const pegMechanismPieChartData = React.useMemo(() => data?.pegMechanismPieChart ?? [], [data?.pegMechanismPieChart])

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
						{totalStablecoinsDataset ? (
							<MultiSeriesChartCard
								title="Total Stablecoin in CEX"
								filterLabel="Stablecoins"
								allValues={['Total']}
								dataset={totalStablecoinsDataset}
								charts={totalStablecoinsCharts}
								valueSymbol="$"
								exportFilenameBase={buildFilename('total-stablecoin-in-cex')}
								exportTitle={buildTitle('Total Stablecoin in CEX')}
							/>
						) : null}

						{stablecoinsByPegMechanismDataset && pegMechanismsUnique.length > 0 ? (
							<MultiSeriesChartCard
								title="Stablecoins by Backing Type"
								filterLabel="Backing"
								allValues={pegMechanismsUnique}
								dataset={stablecoinsByPegMechanismDataset}
								charts={stablecoinsByPegMechanismCharts}
								valueSymbol="$"
								exportFilenameBase={buildFilename('stablecoins-by-backing-type')}
								exportTitle={buildTitle('Stablecoins by Backing Type')}
							/>
						) : null}

						{pegMechanismPieChartData.length > 0 ? (
							<PieChartCard
								title="Distribution by Backing Type"
								chartData={pegMechanismPieChartData}
								exportFilenameBase={buildFilename('stablecoins-backing-type')}
								exportTitle={buildTitle('Stablecoins by Backing Type')}
							/>
						) : null}

						{stablecoinsByPegTypeDataset && pegTypesUnique.length > 0 ? (
							<MultiSeriesChartCard
								title="Stablecoins by Currency Peg"
								filterLabel="Currency"
								allValues={pegTypesUnique}
								dataset={stablecoinsByPegTypeDataset}
								charts={stablecoinsByPegTypeCharts}
								valueSymbol="$"
								exportFilenameBase={buildFilename('stablecoins-by-currency-peg')}
								exportTitle={buildTitle('Stablecoins by Currency Peg')}
							/>
						) : null}

						{stablecoinsByTokenDataset && stablecoinTokensUnique.length > 0 ? (
							<MultiSeriesChartCard
								title="Individual Stablecoins"
								filterLabel="Token"
								allValues={stablecoinTokensUnique}
								dataset={stablecoinsByTokenDataset}
								charts={stablecoinsByTokenCharts}
								valueSymbol="$"
								hideDefaultLegend={true}
								exportFilenameBase={buildFilename('individual-stablecoins')}
								exportTitle={buildTitle('Individual Stablecoins')}
							/>
						) : null}
					</div>
				</>
			)}
		</ProtocolOverviewLayout>
	)
}
