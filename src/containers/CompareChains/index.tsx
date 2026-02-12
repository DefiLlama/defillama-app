import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import * as React from 'react'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/Select/MultiSelectCombobox'
import { Select } from '~/components/Select/Select'
import { TVL_SETTINGS_KEYS, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { getNDistinctColors, getPercentChange, getPrevTvlFromChart } from '~/utils'
import { fetchJson } from '~/utils/async'
import { Stats } from '../ChainOverview/Stats'
import type { IChainOverviewData } from '../ChainOverview/types'
import type { IAdapterChainOverview, IAdapterProtocolOverview } from '../DimensionAdapters/types'

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

interface ChainOption {
	value: string
	label: string
	logo: string
}

interface SupportedChart {
	id: string
	name: string
	key: string
}

// Supported charts configuration
const supportedCharts: SupportedChart[] = [
	{ id: 'tvl', name: 'TVL', key: 'tvlChart' },
	{ id: 'volume', name: 'DEXs Volume', key: 'dexVolumeChart' },
	{ id: 'chainFees', name: 'Chain Fees', key: 'chainFeesChart' },
	{ id: 'chainRevenue', name: 'Chain Revenue', key: 'chainRevenueChart' }
]

type ChainDataResult = {
	chainFeesChart: IAdapterProtocolOverview['totalDataChart'] | null
	chainRevenueChart: IAdapterProtocolOverview['totalDataChart'] | null
	dexVolumeChart: IAdapterChainOverview['totalDataChart'] | null
	chain: string
	chainOverviewData: IChainOverviewData
}

const getChainData = async (chain: string): Promise<ChainDataResult> => {
	const { chain: chainData } = (await fetchJson(`/api/cache/chain/${chain}`)) as {
		chain: {
			chainOverviewData: IChainOverviewData
			dexVolumeChart: IAdapterChainOverview['totalDataChart']
			chainFeesChart: IAdapterProtocolOverview['totalDataChart']
			chainRevenueChart: IAdapterProtocolOverview['totalDataChart']
		}
	}

	return {
		chainFeesChart: chainData.chainFeesChart ?? null,
		chainRevenueChart: chainData.chainRevenueChart ?? null,
		dexVolumeChart: chainData.dexVolumeChart ?? null,
		chain,
		chainOverviewData: chainData.chainOverviewData
	}
}

const useCompare = ({ chains = [] }: { chains?: string[] }) => {
	const data = useQueries({
		queries: chains.map((chain) => ({
			queryKey: ['compare', chain],
			queryFn: () => getChainData(chain),
			staleTime: 60 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 0
		}))
	})

	return {
		data: data.map((r) => r?.data ?? null),
		isLoading: data.some((r) => r.isLoading)
	}
}

// Build chart lookup map for O(1) access
const chartsMap = new Map(supportedCharts.map((c) => [c.key, c]))

type ChartSeriesConfig = {
	type: 'line' | 'bar'
	name: string
	encode: { x: string; y: string }
	stack: string
	color: string
}

const formatChartData = (
	chainsData: Array<ChainDataResult & { tvlChart: Array<[number, number]> | null }>,
	selectedCharts: string[]
): { dataset: { source: Array<Record<string, number>>; dimensions: string[] }; charts: ChartSeriesConfig[] } => {
	if (chainsData.length === 0 || !chainsData.every(Boolean))
		return { dataset: { source: [], dimensions: ['timestamp'] }, charts: [] }

	const colors = getNDistinctColors(selectedCharts.length * chainsData.length)
	let colorIndex = 0
	const seriesNames: string[] = []
	const seriesConfigs: ChartSeriesConfig[] = []
	const rowMap = new Map<number, Record<string, number>>()

	for (const chart of selectedCharts) {
		const targetChart = chartsMap.get(chart)
		if (!targetChart) continue

		const dateInMs = chart === 'tvlChart'

		for (const chainData of chainsData) {
			const name = `${chainData.chain} - ${targetChart.name}`
			seriesNames.push(name)
			seriesConfigs.push({
				type: chart === 'tvlChart' ? 'line' : 'bar',
				name,
				encode: { x: 'timestamp', y: name },
				stack: name,
				color: colors[colorIndex]
			})
			colorIndex++

			const chartEntries = (chainData as Record<string, unknown>)[targetChart.key] as
				| Array<[number, number]>
				| null
				| undefined
			for (const data of chartEntries ?? []) {
				const ts = !dateInMs ? Number(data[0]) * 1e3 : data[0]
				const row = rowMap.get(ts) ?? { timestamp: ts }
				row[name] = data[1]
				rowMap.set(ts, row)
			}
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))
	return { dataset: { source, dimensions: ['timestamp', ...seriesNames] }, charts: seriesConfigs }
}

const updateRoute = (key: string, val: string | string[], router: NextRouter) => {
	router.push(
		{
			query: {
				...router.query,
				[key]: val
			}
		},
		undefined,
		{ shallow: true }
	)
}

const ChartFilters = () => {
	const { selectedValues, setSelectedValues } = useChainsChartFilterState()

	const selectedChartsNames = React.useMemo(() => {
		return selectedValues.map((value) => chartsMap.get(value)?.name ?? '')
	}, [selectedValues])

	return (
		<Select
			allValues={supportedCharts}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			labelType="none"
			label={
				<>
					<span>Charts: </span>
					<span className="text-(--link-text)">
						{selectedChartsNames.length > 2
							? `${selectedChartsNames[0]} + ${selectedChartsNames.length - 1} others`
							: selectedChartsNames.join(', ')}
					</span>
				</>
			}
			triggerProps={{
				className:
					'flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) h-11'
			}}
			placement="bottom-end"
		/>
	)
}

export function CompareChains({ chains }: { chains: ChainOption[] }) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const { selectedValues: selectedChartFilters } = useChainsChartFilterState()

	const router = useRouter()
	const chainsQuery = router.query?.chains

	const { data, isLoading } = useCompare({ chains: router.query?.chains ? [router.query?.chains].flat() : [] })

	const selectedChains = React.useMemo(() => {
		return [chainsQuery]
			.flat()
			.filter((c): c is string => typeof c === 'string')
			.map((chain) => ({ value: chain, label: chain }))
	}, [chainsQuery])

	const selectedChainValues = React.useMemo(() => selectedChains.map((chain) => chain.value), [selectedChains])

	const tvlCharts = React.useMemo(() => {
		const charts: Record<string, TvlChartResult> = {}
		for (const chainData of data) {
			if (!chainData?.chainOverviewData?.tvlChart?.length) continue
			charts[chainData.chain] = formatTvlChart({
				tvlChart: chainData.chainOverviewData.tvlChart,
				tvlSettings,
				extraTvlCharts: chainData.chainOverviewData.extraTvlCharts
			})
		}
		return charts
	}, [data, tvlSettings])

	const chartData = React.useMemo(() => {
		return formatChartData(
			data
				.filter((d): d is ChainDataResult => d != null)
				.map((chainData) => ({ ...chainData, tvlChart: tvlCharts[chainData.chain]?.finalTvlChart ?? null })),
			selectedChartFilters
		)
	}, [data, selectedChartFilters, tvlCharts])

	return (
		<>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="flex-1 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<MultiSelectCombobox
						data={chains}
						placeholder="Select Chains..."
						selectedValues={selectedChainValues}
						setSelectedValues={(values: string[]) => {
							updateRoute('chains', values, router)
						}}
					/>
				</div>

				{selectedChains.length > 1 ? <ChartFilters /> : null}
			</div>

			{selectedChains.length > 1 ? (
				<div className="relative flex flex-col gap-1">
					{isLoading || !router.isReady ? (
						<div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<LocalLoader />
						</div>
					) : (
						<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2
									dataset={chartData.dataset}
									charts={chartData.charts}
									exportButtons={{
										png: true,
										csv: true,
										filename: `compare-chains-${selectedChains.map((chain) => chain.label).join('-vs-')}`,
										pngTitle: `${selectedChains.map((chain) => chain.label).join(' vs ')}`
									}}
								/>
							</React.Suspense>
						</div>
					)}

					<div className="grid grow grid-cols-1 gap-1 xl:grid-cols-2">
						{data
							?.filter((d): d is ChainDataResult => d != null)
							.map((chainData, i) => (
								<div
									className="relative isolate flex flex-col justify-between gap-1 xl:grid-cols-[auto_1fr]"
									key={chainData.chain ?? i}
								>
									<Stats {...chainData.chainOverviewData} hideChart />
								</div>
							))}
					</div>
				</div>
			) : (
				<div className="flex min-h-[362px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<p className="text-sm text-(--text-secondary)">Select at least 2 chains to compare</p>
				</div>
			)}
		</>
	)
}

type TvlChartResult = {
	finalTvlChart: Array<[number, number]>
	totalValueUSD: number | null
	valueChange24hUSD: number | null
	change24h: number | null
	isGovTokensEnabled?: boolean
}

const formatTvlChart = ({
	tvlChart,
	tvlSettings,
	extraTvlCharts
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: IChainOverviewData['extraTvlCharts']
}): TvlChartResult => {
	const toggledTvlSettings = TVL_SETTINGS_KEYS.filter((key) => tvlSettings[key])

	if (toggledTvlSettings.length === 0) {
		const totalValueUSD = getPrevTvlFromChart(tvlChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1)
		const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
	}

	const toggledTvlSettingsSet = new Set(toggledTvlSettings)

	const extraCharts = extraTvlCharts as Record<string, Record<string, number> | undefined>
	const store: Record<string, number> = {}
	for (const [date, tvl] of tvlChart) {
		let sum = tvl
		for (const toggledTvlSetting of toggledTvlSettings) {
			sum += extraCharts[toggledTvlSetting]?.[date] ?? 0
		}
		store[date] = sum
	}

	// if liquidstaking and doublecounted are toggled, we need to subtract the overlapping tvl so you don't add twice
	if (toggledTvlSettingsSet.has('liquidstaking') && toggledTvlSettingsSet.has('doublecounted')) {
		for (const date of Object.keys(store)) {
			store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
		}
	}

	const finalTvlChart: Array<[number, number]> = []
	for (const date of Object.keys(store).sort((a, b) => Number(a) - Number(b))) {
		finalTvlChart.push([+date, store[date]])
	}

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1)
	const valueChange24hUSD = totalValueUSD != null && tvlPrevDay != null ? totalValueUSD - tvlPrevDay : null
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
	const isGovTokensEnabled = !!tvlSettings?.govtokens
	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}

function useChainsChartFilterState() {
	const router = useRouter()

	const selectedValues = supportedCharts
		.map((chart) => chart.key)
		.filter((chart) => (chart === 'tvlChart' ? router.query[chart] !== 'false' : router.query[chart] === 'true'))

	const setSelectedValues: React.Dispatch<React.SetStateAction<Array<string> | string>> = (action) => {
		const resolved = typeof action === 'function' ? action(selectedValues) : action
		const valuesArray = Array.isArray(resolved) ? resolved : [resolved]
		router.push(
			{
				query: {
					chains: router.query.chains,
					...valuesArray.reduce<Record<string, string>>((acc, value) => {
						acc[value] = 'true'
						return acc
					}, {})
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return { selectedValues, setSelectedValues }
}
