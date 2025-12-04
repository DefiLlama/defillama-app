import { lazy, Suspense, useMemo } from 'react'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import {
	useStablecoinsChartData,
	useStablecoinChainsList,
	StablecoinChainInfo
} from '~/containers/ProDashboard/components/datasets/StablecoinsDataset/useStablecoinsChartData'
import { STABLECOIN_TOKEN_COLORS } from '~/containers/ProDashboard/utils/colorManager'
import { chainIconUrl, formattedNum } from '~/utils'
import { AriakitVirtualizedSelect, VirtualizedSelectOption } from '../AriakitVirtualizedSelect'
import { AriakitSelect } from '../AriakitSelect'
import { ChartTabType } from './types'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface StablecoinsChartTabProps {
	selectedStablecoinChain: string
	selectedStablecoinChartType: string
	onSelectedStablecoinChainChange: (chain: string) => void
	onSelectedStablecoinChartTypeChange: (chartType: string) => void
	onChartTabChange: (tab: ChartTabType) => void
}

const STABLECOIN_CHART_TYPES = [
	{ value: 'totalMcap', label: 'Total Market Cap' },
	{ value: 'tokenMcaps', label: 'Token Market Caps' },
	{ value: 'pie', label: 'Pie' },
	{ value: 'dominance', label: 'Dominance' },
	{ value: 'usdInflows', label: 'USD Inflows' },
	{ value: 'tokenInflows', label: 'Token Inflows' }
]

const chartOptions = {
	grid: {
		left: 12,
		bottom: 68,
		top: 12,
		right: 12,
		outerBoundsMode: 'same',
		outerBoundsContain: 'axisLabel'
	}
}

const inflowsChartOptions = {
	overrides: {
		inflow: true
	}
}

const MCAP_STACKS = ['Mcap']
const EMPTY_HALLMARKS: [number, string][] = []

export function StablecoinsChartTab({
	selectedStablecoinChain,
	selectedStablecoinChartType,
	onSelectedStablecoinChainChange,
	onSelectedStablecoinChartTypeChange,
	onChartTabChange
}: StablecoinsChartTabProps) {
	const { data: chainsList = [], isLoading: chainsLoading } = useStablecoinChainsList()

	const chainOptions: VirtualizedSelectOption[] = useMemo(() => {
		const options: VirtualizedSelectOption[] = [
			{ value: 'All', label: 'All Chains', icon: '🌐' }
		]
		;(chainsList as StablecoinChainInfo[]).forEach((chain) => {
			options.push({
				value: chain.name,
				label: chain.name,
				logo: chainIconUrl(chain.name),
				description: formattedNum(chain.tvl, true)
			})
		})
		return options
	}, [chainsList])

	const {
		peggedAreaTotalData,
		peggedAreaChartData,
		chainsCirculatingValues,
		dataWithExtraPeggedAndDominanceByDay,
		usdInflows,
		tokenInflows,
		tokenInflowNames,
		peggedAssetNames,
		totalMcapCurrent,
		isLoading: chartDataLoading
	} = useStablecoinsChartData(selectedStablecoinChain)

	const isLoading = chainsLoading || chartDataLoading

	const chartTypeLabel = STABLECOIN_CHART_TYPES.find((t) => t.value === selectedStablecoinChartType)?.label || ''

	const renderChart = () => {
		if (isLoading) {
			return (
				<div className="flex h-[320px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}

		switch (selectedStablecoinChartType) {
			case 'totalMcap':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							chartData={peggedAreaTotalData}
							stacks={MCAP_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hallmarks={EMPTY_HALLMARKS}
							color="#4f8fea"
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'tokenMcaps':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							chartData={peggedAreaChartData}
							stacks={peggedAssetNames}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							stackColors={STABLECOIN_TOKEN_COLORS}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'pie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={chainsCirculatingValues} stackColors={STABLECOIN_TOKEN_COLORS} />
					</Suspense>
				)
			case 'dominance':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<AreaChart
							title=""
							valueSymbol="%"
							chartData={dataWithExtraPeggedAndDominanceByDay}
							stacks={peggedAssetNames}
							hideDefaultLegend={true}
							hideGradient={true}
							expandTo100Percent={true}
							stackColors={STABLECOIN_TOKEN_COLORS}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'usdInflows':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<BarChart chartData={usdInflows} color="#4f8fea" title="" />
					</Suspense>
				)
			case 'tokenInflows':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<BarChart
							chartData={tokenInflows}
							title=""
							hideDefaultLegend={true}
							customLegendName="Token"
							customLegendOptions={tokenInflowNames}
							chartOptions={inflowsChartOptions}
							stackColors={STABLECOIN_TOKEN_COLORS}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	return (
		<div className="flex h-full min-h-[400px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col border lg:w-[420px]">
				<div className="flex h-full flex-col p-3">
					<div className="mb-3 rounded-lg border border-(--cards-border) bg-(--cards-bg-alt)/60 p-1">
						<div className="grid grid-cols-3 gap-1">
							<button
								type="button"
								onClick={() => onChartTabChange('chain')}
								className="group rounded-md px-3 py-2.5 text-xs font-semibold text-(--text-secondary) transition-all hover:bg-(--cards-bg) hover:text-(--text-primary)"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name="bar-chart-2"
										width={14}
										height={14}
										className="text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)"
									/>
									<span>Protocols/Chains</span>
								</div>
							</button>
							<button
								type="button"
								onClick={() => onChartTabChange('yields')}
								className="group rounded-md px-3 py-2.5 text-xs font-semibold text-(--text-secondary) transition-all hover:bg-(--cards-bg) hover:text-(--text-primary)"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon
										name="percent"
										width={14}
										height={14}
										className="text-(--text-tertiary) transition-colors group-hover:text-(--text-secondary)"
									/>
									<span>Yields</span>
								</div>
							</button>
							<button
								type="button"
								className="group rounded-md bg-(--primary)/10 px-3 py-2.5 text-xs font-semibold text-(--primary) shadow-sm transition-all"
							>
								<div className="flex items-center justify-center gap-2">
									<Icon name="dollar-sign" width={14} height={14} className="text-(--primary)" />
									<span>Stablecoins</span>
								</div>
							</button>
						</div>
					</div>

					<div className="mb-3 flex-shrink-0 space-y-2">
						<AriakitVirtualizedSelect
							label="Chain"
							options={chainOptions}
							selectedValue={selectedStablecoinChain}
							onChange={(option) => onSelectedStablecoinChainChange(option.value)}
							placeholder="Select chain..."
							isLoading={chainsLoading}
						/>

						<AriakitSelect
							label="Chart Type"
							options={STABLECOIN_CHART_TYPES}
							selectedValue={selectedStablecoinChartType}
							onChange={(option) => onSelectedStablecoinChartTypeChange(option.value)}
							placeholder="Select chart type..."
						/>
					</div>

					<div className="pro-text3 mt-auto text-xs">
						{totalMcapCurrent !== null && (
							<p>
								Total Market Cap: <span className="pro-text1 font-semibold">{formattedNum(totalMcapCurrent, true)}</span>
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="pro-text2 flex-shrink-0 px-3 py-2 text-xs font-medium">Preview</div>

				{selectedStablecoinChain ? (
					<div className="min-h-0 flex-1 overflow-auto rounded-md bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="pro-text1 mb-1 text-sm font-semibold">
								{selectedStablecoinChain === 'All' ? 'All Chains' : selectedStablecoinChain} - {chartTypeLabel}
							</h3>
							<p className="pro-text2 text-xs">Stablecoins Market Cap</p>
						</div>

						<div className="min-h-[320px]">{renderChart()}</div>
					</div>
				) : (
					<div className="pro-text3 flex flex-1 items-center justify-center text-center">
						<div>
							<Icon name="dollar-sign" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a chain and chart type to see preview</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
