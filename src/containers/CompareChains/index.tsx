import * as Ariakit from '@ariakit/react'
import { useQueries } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { feesOptions } from '~/components/Filters/options'
import { useProtocolsFilterState } from '~/components/Filters/useProtocolFilterState'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/Select/MultiSelectCombobox'
import { Select } from '~/components/Select/Select'
import type { IAdapterChainOverview, IAdapterProtocolOverview } from '~/containers/AdapterMetrics/types'
import { Stats } from '~/containers/ChainOverview/Stats'
import type { IChainOverviewData } from '~/containers/ChainOverview/types'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { getNDistinctColors } from '~/utils'
import { fetchJson } from '~/utils/async'
import {
	applyCompareChainsFeeExtras,
	buildCompareChainsFeeExtraFetchConfigs,
	getCompareChainsFeeExtraFailedMetrics,
	hasSelectedCompareChainsFeeChart,
	type CompareChainsFeeExtraChartsByChain
} from './feeExtras'
import { buildCompareChainsTvlChartState, type CompareChainsTvlChartState } from './tvlChart'

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

type CompareResult = {
	data: Array<ChainDataResult | null>
	isLoading: boolean
	failedChains: string[]
}

type CompareQueryResult = {
	queryFnData: ChainDataResult
	error: Error
	data: ChainDataResult
}

const getChainData = async (chain: string): Promise<ChainDataResult> => {
	const { chain: chainData } = (await fetchJson(`/api/dynamic/cache/chain/${chain}`)) as {
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
	const queries = React.useMemo(
		() =>
			chains.map((chain) => ({
				queryKey: ['compare-chains', chain],
				queryFn: () => getChainData(chain),
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: 0
			})),
		[chains]
	)

	return useQueries<Array<CompareQueryResult>, CompareResult>({
		queries,
		combine: React.useCallback(
			(results) => ({
				data: results.map((result) => result.data ?? null),
				isLoading: results.some((result) => result.isLoading),
				failedChains: results.flatMap((result, index) => (result.error && chains[index] ? [chains[index]] : []))
			}),
			[chains]
		)
	})
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
	void router.push(
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

const FeeExtraFilters = () => {
	const { selectedValues, setSelectedValues } = useProtocolsFilterState(feesOptions)

	return (
		<Select
			allValues={feesOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			label="Include in Fees"
			labelType="none"
			triggerProps={{
				className:
					'flex cursor-pointer flex-nowrap items-center gap-2 rounded-md bg-(--btn-bg) px-3 py-2 text-xs text-(--text-primary) hover:bg-(--btn-hover-bg) focus-visible:bg-(--btn-hover-bg) h-11'
			}}
			placement="bottom-end"
			unmountOnHide={false}
		/>
	)
}

export function CompareChains({ chains }: { chains: ChainOption[] }) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const [feesSettings] = useLocalStorageSettingsManager('fees')
	const { selectedValues: selectedChartFilters } = useChainsChartFilterState()

	const router = useRouter()
	const chainsQuery = router.query?.chains

	const selectedChains = React.useMemo(() => {
		return [chainsQuery]
			.flat()
			.filter((c): c is string => typeof c === 'string')
			.map((chain) => ({ value: chain, label: chain }))
	}, [chainsQuery])

	const selectedChainValues = React.useMemo(() => selectedChains.map((chain) => chain.value), [selectedChains])

	const { data, isLoading, failedChains } = useCompare({
		chains: selectedChainValues
	})

	const loadedChainData = React.useMemo(
		() => (selectedChains.length > 1 ? data.filter((d): d is ChainDataResult => d != null) : []),
		[data, selectedChains.length]
	)

	const feeExtraFetchConfigs = React.useMemo(
		() =>
			buildCompareChainsFeeExtraFetchConfigs({
				chainData: loadedChainData,
				selectedCharts: selectedChartFilters,
				feesSettings
			}),
		[loadedChainData, selectedChartFilters, feesSettings]
	)

	const feeExtraQueries = React.useMemo(
		() =>
			feeExtraFetchConfigs.map((config) => ({
				queryKey: config.queryKey,
				queryFn: () => fetchJson<Array<[number, number]>>(config.url),
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: 0
			})),
		[feeExtraFetchConfigs]
	)

	const feeExtraResults = useQueries({
		queries: feeExtraQueries,
		combine: React.useCallback(
			(results) =>
				results.map(({ data: queryData, error, isLoading: queryIsLoading }) => ({
					data: queryData,
					error,
					isLoading: queryIsLoading
				})),
			[]
		)
	})

	const feeExtraChartsByChain = React.useMemo<CompareChainsFeeExtraChartsByChain>(() => {
		const charts: CompareChainsFeeExtraChartsByChain = {}
		for (let index = 0; index < feeExtraFetchConfigs.length; index++) {
			const extraChart = feeExtraResults[index]?.data
			if (!extraChart) continue

			const config = feeExtraFetchConfigs[index]
			const chainCharts = charts[config.chain] ?? {}
			chainCharts[config.dataType] = extraChart
			charts[config.chain] = chainCharts
		}
		return charts
	}, [feeExtraFetchConfigs, feeExtraResults])

	const failedMetrics = React.useMemo(
		() => [
			...failedChains,
			...getCompareChainsFeeExtraFailedMetrics({ configs: feeExtraFetchConfigs, results: feeExtraResults })
		],
		[failedChains, feeExtraFetchConfigs, feeExtraResults]
	)

	const showFeeExtraFilters = hasSelectedCompareChainsFeeChart(selectedChartFilters)

	const tvlCharts = React.useMemo(() => {
		const charts: Record<string, CompareChainsTvlChartState> = {}
		for (const chainData of data) {
			if (!chainData?.chainOverviewData?.tvlChart?.length) continue
			charts[chainData.chain] = buildCompareChainsTvlChartState({
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
				.map((chainData) => {
					const feeAdjustedData = applyCompareChainsFeeExtras({
						chainData,
						selectedCharts: selectedChartFilters,
						feesSettings,
						feeExtraCharts: feeExtraChartsByChain[chainData.chain]
					})
					return { ...feeAdjustedData, tvlChart: tvlCharts[chainData.chain]?.finalTvlChart ?? null }
				}),
			selectedChartFilters
		)
	}, [data, selectedChartFilters, tvlCharts, feesSettings, feeExtraChartsByChain])

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

				{selectedChains.length > 1 ? (
					<>
						<ChartFilters />
						{showFeeExtraFilters ? <FeeExtraFilters /> : null}
					</>
				) : null}
			</div>

			{selectedChains.length > 1 ? (
				<div className="relative flex flex-col gap-1">
					{isLoading || !router.isReady ? (
						<div className="flex h-full min-h-[400px] w-full items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<LocalLoader />
						</div>
					) : (
						<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<React.Suspense fallback={<div className="min-h-[398px]" />}>
								<MultiSeriesChart2
									dataset={chartData.dataset}
									charts={chartData.charts}
									showTotalInTooltip
									exportButtons={{
										png: true,
										csv: true,
										filename: `compare-chains-${selectedChains.map((chain) => chain.label).join('-vs-')}`,
										pngTitle: `${selectedChains.map((chain) => chain.label).join(' vs ')}`
									}}
								/>
							</React.Suspense>
							<FailedCompareChainsPopover failedChains={failedMetrics} />
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

function FailedCompareChainsPopover({ failedChains }: { failedChains: string[] }) {
	if (failedChains.length === 0) {
		return null
	}

	return (
		<Ariakit.PopoverProvider>
			<Ariakit.PopoverDisclosure className="absolute right-2 bottom-2 z-10 flex items-center justify-center rounded-full border border-(--cards-border) bg-(--bg-main) p-1.5 text-(--error) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)">
				<Icon name="alert-triangle" className="size-3.5" />
				<span className="sr-only">Show failed chain APIs</span>
			</Ariakit.PopoverDisclosure>
			<Ariakit.Popover
				unmountOnHide
				hideOnInteractOutside
				gutter={6}
				className="z-10 mr-1 flex max-h-[calc(100dvh-80px)] w-[min(calc(100vw-16px),300px)] flex-col gap-1 overflow-auto overscroll-contain rounded-md border border-[hsl(204,20%,88%)] bg-(--bg-main) p-2 text-xs dark:border-[hsl(204,3%,32%)]"
			>
				<p className="font-medium text-(--error)">Failed to load data for:</p>
				<ul className="pl-4">
					{failedChains.map((chain) => (
						<li key={chain} className="list-disc">
							{chain}
						</li>
					))}
				</ul>
			</Ariakit.Popover>
		</Ariakit.PopoverProvider>
	)
}

function useChainsChartFilterState() {
	const router = useRouter()

	const selectedValues = supportedCharts
		.map((chart) => chart.key)
		.filter((chart) => (chart === 'tvlChart' ? router.query[chart] !== 'false' : router.query[chart] === 'true'))

	const setSelectedValues: React.Dispatch<React.SetStateAction<Array<string> | string>> = (action) => {
		const resolved = typeof action === 'function' ? action(selectedValues) : action
		const valuesArray = (Array.isArray(resolved) ? resolved : [resolved]).filter(
			(value): value is string => typeof value === 'string'
		)
		const selectedSet = new Set(valuesArray)

		void router.push(
			{
				query: {
					chains: router.query.chains,
					...supportedCharts.reduce<Record<string, string>>((acc, chart) => {
						acc[chart.key] = selectedSet.has(chart.key) ? 'true' : 'false'
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
