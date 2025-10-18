import * as React from 'react'
import { useRouter } from 'next/router'
import type { NextRouter } from 'next/router'
import { useQueries } from '@tanstack/react-query'
import { LocalLoader } from '~/components/Loaders'
import { MultiSelectCombobox } from '~/components/MultiSelectCombobox'
import { Select } from '~/components/Select'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { getNDistinctColors, getPercentChange, getPrevTvlFromChart } from '~/utils'
import { fetchJson } from '~/utils/async'
import { Stats } from '../ChainOverview/Stats'
import { IChainOverviewData } from '../ChainOverview/types'
import { IAdapterOverview, IAdapterSummary } from '../DimensionAdapters/queries'

const LineAndBarChart: any = React.lazy(() => import('~/components/ECharts/LineAndBarChart'))

// Supported charts configuration
const supportedCharts = [
	{
		id: 'tvl',
		name: 'TVL',
		key: 'tvlChart'
	},
	{
		id: 'volume',
		name: 'DEXs Volume',
		key: 'dexVolumeChart'
	},
	{
		id: 'chainFees',
		name: 'Chain Fees',
		key: 'chainFeesChart'
	},
	{
		id: 'chainRevenue',
		name: 'Chain Revenue',
		key: 'chainRevenueChart'
	}
	// {
	// 	id: 'appRevenue',
	// 	name: 'App Revenue',
	// 	key: 'appRevenueChart'
	// },
	// {
	// 	id: 'appFees',
	// 	name: 'App Fees',
	// 	key: 'appFeesChart'
	// },
	// {
	// 	id: 'addresses',
	// 	name: 'Active Addresses',
	// 	key: 'activeAddressesChart'
	// },
	// {
	// 	id: 'txs',
	// 	name: 'Transactions',
	// 	key: 'txsChart'
	// }
]

export const getChainData = async (chain: string) => {
	const { chain: chainData } = (await fetchJson(`/api/cache/chain/${chain}`)) as {
		chain: {
			chainOverviewData: IChainOverviewData
			dexVolumeChart: IAdapterOverview['totalDataChart']
			chainFeesChart: IAdapterSummary['totalDataChart']
			chainRevenueChart: IAdapterSummary['totalDataChart']
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

export const useCompare = ({ chains = [] }: { chains?: string[] }) => {
	const data = useQueries({
		queries: chains.map((chain) => ({
			queryKey: ['compare', chain],
			queryFn: () => getChainData(chain),
			staleTime: 60 * 60 * 1000
		}))
	})

	return {
		data: data.map((r) => r?.data ?? null),
		isLoading: data.some((r) => r.isLoading)
	}
}

const formatChartData = (chainsData: any, selectedCharts: string[]) => {
	if (!chainsData || !chainsData.length || !chainsData.every(Boolean)) return []

	const finalCharts = {}

	let colors = getNDistinctColors(selectedCharts.length * chainsData.length)
	let colorIndex = 0
	for (const chart of selectedCharts) {
		const targetChart = supportedCharts.find((c) => c.key === chart)
		if (!targetChart) continue

		const dateInMs = chart === 'tvlChart'

		for (const chainData of chainsData) {
			const name = `${chainData.chain} - ${targetChart.name}`
			finalCharts[name] = {
				name,
				stack: name,
				data: chainData[targetChart.key].map((data) => [!dateInMs ? Number(data[0]) * 1e3 : data[0], data[1]]),
				type: chart === 'tvlChart' ? 'line' : 'bar',
				color: colors[colorIndex]
			}
			colorIndex++
		}
	}

	return finalCharts
}

const updateRoute = (key, val, router: NextRouter) => {
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
		return selectedValues.map((value) => supportedCharts.find((chart) => chart.key === value)?.name ?? '')
	}, [selectedValues])

	return (
		<Select
			allValues={supportedCharts}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			selectOnlyOne={(newOption) => {
				setSelectedValues([newOption])
			}}
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

export function CompareChains({ chains }) {
	const [tvlSettings] = useLocalStorageSettingsManager('tvl')
	const { selectedValues: selectedChartFilters } = useChainsChartFilterState()

	const router = useRouter()

	const { data, isLoading } = useCompare({ chains: router.query?.chains ? [router.query?.chains].flat() : [] })

	const selectedChains = React.useMemo(() => {
		return [router?.query?.chains]
			.flat()
			.filter(Boolean)
			.map((chain) => ({ value: chain, label: chain }))
	}, [router.query])

	const tvlCharts = React.useMemo(() => {
		const charts = {}
		for (const chainData of data) {
			if (!chainData || !chainData.chainOverviewData || !chainData.chainOverviewData.tvlChart?.length) continue
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
				.filter(Boolean)
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
						selectedValues={selectedChains.map((chain) => chain.value)}
						setSelectedValues={(values) => {
							updateRoute('chains', values, router)
						}}
					/>
				</div>

				{selectedChains.length > 1 && <ChartFilters />}
			</div>

			{selectedChains.length > 1 ? (
				<div className="relative flex flex-col gap-1">
					{isLoading || !router.isReady ? (
						<div className="grid min-h-[362px] place-items-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<LocalLoader />
						</div>
					) : (
						<div className="min-h-[362px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
							<React.Suspense fallback={<></>}>
								<LineAndBarChart title="" charts={chartData} />
							</React.Suspense>
						</div>
					)}

					<div className="grid grow grid-cols-1 gap-1 xl:grid-cols-2">
						{data?.filter(Boolean)?.map((chainData, i) => {
							return (
								<div
									className="relative isolate flex flex-col justify-between gap-1 xl:grid-cols-[auto_1fr]"
									key={`${chainData?.chain || i}`}
								>
									<ChainContainer
										{...chainData.chainOverviewData}
										totalValueUSD={tvlCharts[chainData.chain]?.totalValueUSD}
										change24h={tvlCharts[chainData.chain]?.change24h}
										valueChange24hUSD={tvlCharts[chainData.chain]?.valueChange24hUSD}
									/>
								</div>
							)
						})}
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

const ChainContainer = (
	props: IChainOverviewData & {
		totalValueUSD: number
		change24h: number
		valueChange24hUSD: number
	}
) => {
	return <Stats {...props} hideChart />
}

const formatTvlChart = ({
	tvlChart,
	tvlSettings,
	extraTvlCharts
}: {
	tvlChart: IChainOverviewData['tvlChart']
	tvlSettings: Record<string, boolean>
	extraTvlCharts: IChainOverviewData['extraTvlCharts']
}) => {
	const toggledTvlSettings = Object.entries(tvlSettings)
		.filter(([key, value]) => value)
		.map(([key]) => key)

	if (toggledTvlSettings.length === 0) {
		const totalValueUSD = getPrevTvlFromChart(tvlChart, 0)
		const tvlPrevDay = getPrevTvlFromChart(tvlChart, 1)
		const valueChange24hUSD = totalValueUSD - tvlPrevDay
		const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
		return { finalTvlChart: tvlChart, totalValueUSD, valueChange24hUSD, change24h }
	}

	const store: Record<string, number> = {}
	for (const [date, tvl] of tvlChart) {
		let sum = tvl
		for (const toggledTvlSetting of toggledTvlSettings) {
			sum += extraTvlCharts[toggledTvlSetting]?.[date] ?? 0
		}
		store[date] = sum
	}

	// if liquidstaking and doublecounted are toggled, we need to subtract the overlapping tvl so you dont add twice
	if (toggledTvlSettings.includes('liquidstaking') && toggledTvlSettings.includes('doublecounted')) {
		for (const date in store) {
			store[date] -= extraTvlCharts['dcAndLsOverlap']?.[date] ?? 0
		}
	}

	const finalTvlChart = []
	for (const date in store) {
		finalTvlChart.push([+date, store[date]])
	}

	const totalValueUSD = getPrevTvlFromChart(finalTvlChart, 0)
	const tvlPrevDay = getPrevTvlFromChart(finalTvlChart, 1)
	const valueChange24hUSD = totalValueUSD - tvlPrevDay
	const change24h = getPercentChange(totalValueUSD, tvlPrevDay)
	const isGovTokensEnabled = tvlSettings?.govtokens ? true : false
	return { finalTvlChart, totalValueUSD, valueChange24hUSD, change24h, isGovTokensEnabled }
}

export function useChainsChartFilterState() {
	const router = useRouter()

	const selectedValues = supportedCharts
		.map((chart) => chart.key)
		.filter((chart) => (chart === 'tvlChart' ? router.query[chart] !== 'false' : router.query[chart] === 'true'))

	const setSelectedValues = (values) => {
		router.push(
			{
				query: {
					chains: router.query.chains,
					...values.reduce((acc, value) => {
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
