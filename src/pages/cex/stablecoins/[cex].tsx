import { useQuery } from '@tanstack/react-query'
import type { GetStaticPropsContext } from 'next'
import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { TokenLogo } from '~/components/TokenLogo'
import { fetchProtocolOverviewMetrics, fetchProtocolTvlTokenBreakdownChart } from '~/containers/ProtocolOverview/api'
import type { IProtocolTokenBreakdownChart } from '~/containers/ProtocolOverview/api.types'
import { ProtocolOverviewLayout } from '~/containers/ProtocolOverview/Layout'
import type { IProtocolPageMetrics } from '~/containers/ProtocolOverview/types'
import {
	filterStablecoinsFromTokens,
	getStablecoinsList,
	groupTokensByPegMechanism,
	groupTokensByPegType
} from '~/containers/ProtocolOverview/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { formattedNum, slug, tokenIconUrl } from '~/utils'
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

		const protocolData = await fetchProtocolOverviewMetrics(exchangeName)

		if (!protocolData) {
			return { notFound: true, props: null }
		}

		return {
			props: {
				name: protocolData.name,
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
type StablecoinDateRow = { date: number } & Record<string, number>
type StablecoinPiePoint = { name: string; value: number }
type StablecoinTotalsPoint = { date: number; value: number }

interface StablecoinChartsData {
	stablecoinsByPegMechanism: StablecoinDateRow[] | null
	stablecoinsByPegType: StablecoinDateRow[] | null
	stablecoinsByToken: StablecoinDateRow[] | null
	totalStablecoins: StablecoinTotalsPoint[] | null
	pegMechanismPieChart: StablecoinPiePoint[]
	stablecoinTokensUnique: string[]
	pegTypesUnique: string[]
	pegMechanismsUnique: string[]
}

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
	const [selected, setSelected] = React.useState<string[]>(() => allValues)

	const selectedChartsSet = React.useMemo(() => new Set(selected), [selected])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h2 className="mr-auto text-base font-semibold">{title}</h2>
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
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<MultiSeriesChart2
					dataset={dataset}
					charts={charts}
					valueSymbol={valueSymbol}
					hideDefaultLegend={hideDefaultLegend}
					selectedCharts={selectedChartsSet}
					onReady={handleChartReady}
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
	const [selectedValues, setSelectedValues] = React.useState<string[]>(() => allValues)

	const selectedValuesSet = React.useMemo(() => new Set(selectedValues), [selectedValues])

	const filteredChartData = React.useMemo(() => {
		if (selectedValues.length === 0) return []
		return chartData.filter((d) => selectedValuesSet.has(d.name))
	}, [chartData, selectedValues.length, selectedValuesSet])

	const { chartInstance, handleChartReady } = useGetChartInstance()

	return (
		<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
			<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
				<h2 className="mr-auto text-base font-semibold">{title}</h2>
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
				<ChartExportButtons chartInstance={chartInstance} filename={exportFilenameBase} title={exportTitle} />
			</div>
			<React.Suspense fallback={<div className="min-h-[360px]" />}>
				<PieChart chartData={filteredChartData} onReady={handleChartReady} />
			</React.Suspense>
		</div>
	)
}

function useStablecoinData(protocolName: string) {
	const {
		data: tokenBreakdownData,
		isLoading: isTokenBreakdownLoading,
		dataUpdatedAt: tokenBreakdownDataUpdatedAt
	} = useQuery<IProtocolTokenBreakdownChart | null>({
		queryKey: ['cex', protocolName, 'stablecoins', 'token-breakdown'],
		queryFn: () => fetchProtocolTvlTokenBreakdownChart({ protocol: protocolName }),
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const {
		data: stablecoinsList,
		isLoading: isStablecoinsListLoading,
		dataUpdatedAt: stablecoinsListUpdatedAt
	} = useQuery({
		queryKey: ['cex', 'stablecoins', 'list', 'v1'],
		queryFn: () => getStablecoinsList(),
		staleTime: 6 * 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	const peggedAssets = stablecoinsList?.peggedAssets ?? []

	const { data, isLoading } = useQuery<StablecoinChartsData | null>({
		queryKey: [
			'cex',
			protocolName,
			'stablecoins',
			'charts-data',
			'v2',
			tokenBreakdownDataUpdatedAt,
			stablecoinsListUpdatedAt
		],
		queryFn: async () => {
			if (!tokenBreakdownData || tokenBreakdownData.length === 0) return null
			if (!peggedAssets || peggedAssets.length === 0) return null

			const stablecoinSymbols = new Set<string>()
			const pegTypeMap = new Map<string, string>()
			const pegMechanismMap = new Map<string, string>()

			for (const asset of peggedAssets) {
				stablecoinSymbols.add(asset.symbol)
				pegTypeMap.set(asset.symbol, asset.pegType)
				pegMechanismMap.set(asset.symbol, asset.pegMechanism)
			}

			const stablecoinTokensUniqueSet = new Set<string>()
			const pegTypesUnique = new Set<string>()
			const pegMechanismsUnique = new Set<string>()
			const stablecoinsByPegMechanism: Record<number, StablecoinDateRow> = {}
			const stablecoinsByPegType: Record<number, StablecoinDateRow> = {}
			const stablecoinsByToken: Record<number, StablecoinDateRow> = {}
			const totalStablecoins: Record<number, number> = {}

			for (const [rawDate, tokens] of tokenBreakdownData) {
				const date = rawDate > 1e12 ? Math.floor(rawDate / 1e3) : rawDate
				const stablecoinsOnly = filterStablecoinsFromTokens(tokens, stablecoinSymbols)

				if (Object.keys(stablecoinsOnly).length === 0) continue

				for (const token in stablecoinsOnly) {
					stablecoinTokensUniqueSet.add(token)
					const pegType = pegTypeMap.get(token)
					const pegMechanism = pegMechanismMap.get(token)
					if (pegType) pegTypesUnique.add(pegType)
					if (pegMechanism) pegMechanismsUnique.add(pegMechanism)
				}

				const groupedByPegMechanism = groupTokensByPegMechanism(stablecoinsOnly, pegMechanismMap)
				const groupedByPegType = groupTokensByPegType(stablecoinsOnly, pegTypeMap)

				if (!stablecoinsByPegMechanism[date]) stablecoinsByPegMechanism[date] = { date }
				for (const mechanism in groupedByPegMechanism) {
					stablecoinsByPegMechanism[date][mechanism] =
						(stablecoinsByPegMechanism[date][mechanism] || 0) + groupedByPegMechanism[mechanism]
				}

				if (!stablecoinsByPegType[date]) stablecoinsByPegType[date] = { date }
				for (const pegType in groupedByPegType) {
					stablecoinsByPegType[date][pegType] = (stablecoinsByPegType[date][pegType] || 0) + groupedByPegType[pegType]
				}

				if (!stablecoinsByToken[date]) stablecoinsByToken[date] = { date }
				let total = 0
				for (const token in stablecoinsOnly) {
					stablecoinsByToken[date][token] = (stablecoinsByToken[date][token] || 0) + stablecoinsOnly[token]
					total += stablecoinsOnly[token]
				}
				totalStablecoins[date] = (totalStablecoins[date] || 0) + total
			}

			const stablecoinsByPegMechanismArray = Object.values(stablecoinsByPegMechanism).sort((a, b) => a.date - b.date)
			const stablecoinsByPegTypeArray = Object.values(stablecoinsByPegType).sort((a, b) => a.date - b.date)
			const stablecoinsByTokenArray = Object.values(stablecoinsByToken).sort((a, b) => a.date - b.date)
			const totalStablecoinsArray: StablecoinTotalsPoint[] = Object.entries(totalStablecoins)
				.map(([date, value]) => ({ date: Number(date), value }))
				.sort((a, b) => a.date - b.date)

			const latestByPegMechanism = stablecoinsByPegMechanismArray[stablecoinsByPegMechanismArray.length - 1]
			const pegMechanismPieChart: StablecoinPiePoint[] = latestByPegMechanism
				? Object.entries(latestByPegMechanism)
						.filter(([name]) => name !== 'date')
						.map(([name, value]) => ({ name, value: Number(value) }))
				: []

			return {
				stablecoinsByPegMechanism: stablecoinsByPegMechanismArray.length > 0 ? stablecoinsByPegMechanismArray : null,
				stablecoinsByPegType: stablecoinsByPegTypeArray.length > 0 ? stablecoinsByPegTypeArray : null,
				stablecoinsByToken: stablecoinsByTokenArray.length > 0 ? stablecoinsByTokenArray : null,
				totalStablecoins: totalStablecoinsArray.length > 0 ? totalStablecoinsArray : null,
				pegMechanismPieChart: preparePieChartData({ data: pegMechanismPieChart, limit: 10 }),
				stablecoinTokensUnique: Array.from(stablecoinTokensUniqueSet),
				pegTypesUnique: Array.from(pegTypesUnique),
				pegMechanismsUnique: Array.from(pegMechanismsUnique)
			}
		},
		enabled: !!tokenBreakdownData?.length && peggedAssets.length > 0,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})

	return { data, isLoading: isLoading || isTokenBreakdownLoading || isStablecoinsListLoading }
}

export default function CEXStablecoins(props: {
	name: string
	category: string | null
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
			<div className="flex items-center gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<TokenLogo logo={tokenIconUrl(props.name)} size={24} />
				<h1 className="text-xl font-bold">{props.name}</h1>
			</div>
			{isLoading ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<LocalLoader />
				</div>
			) : !data ? (
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<p className="text-(--text-label)">No stablecoin data available for this exchange</p>
				</div>
			) : (
				<>
					<div className="flex min-h-[46px] w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Total Stablecoin in CEX</span>
							<span className="text-sm font-medium">{currentTotal ? formattedNum(currentTotal, true) : '-'}</span>
						</div>
						{stablecoinBreakdown && stablecoinBreakdown.length > 0 && (
							<>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm text-(--text-label)">Dominant Backing Type</span>
									<span className="text-sm font-medium capitalize">
										{stablecoinBreakdown[0].mechanism.replace('-', ' ')}
									</span>
									<span className="text-sm text-(--text-label)">({stablecoinBreakdown[0].percentage.toFixed(1)}%)</span>
								</div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm text-(--text-label)">Fiat-Backed %</span>
									<span className="text-sm font-medium">
										{stablecoinBreakdown.find((b) => b.mechanism === 'fiat-backed')?.percentage.toFixed(1) || '0'}%
									</span>
								</div>
								<div className="flex items-baseline gap-1.5">
									<span className="text-sm text-(--text-label)">Number of Stablecoins</span>
									<span className="text-sm font-medium">{data.stablecoinTokensUnique?.length || 0}</span>
								</div>
							</>
						)}
					</div>

					<div className="grid grid-cols-2 gap-2">
						{totalStablecoinsDataset ? (
							<MultiSeriesChartCard
								key={`${buildFilename('total-stablecoin-in-cex')}:${['Total'].join('|')}`}
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
								key={`${buildFilename('stablecoins-by-backing-type')}:${pegMechanismsUnique.join('|')}`}
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
								key={`${buildFilename('stablecoins-backing-type')}:${pegMechanismPieChartData.map((d) => d.name).join('|')}`}
								title="Distribution by Backing Type"
								chartData={pegMechanismPieChartData}
								exportFilenameBase={buildFilename('stablecoins-backing-type')}
								exportTitle={buildTitle('Stablecoins by Backing Type')}
							/>
						) : null}

						{stablecoinsByPegTypeDataset && pegTypesUnique.length > 0 ? (
							<MultiSeriesChartCard
								key={`${buildFilename('stablecoins-by-currency-peg')}:${pegTypesUnique.join('|')}`}
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
								key={`${buildFilename('individual-stablecoins')}:${stablecoinTokensUnique.join('|')}`}
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
