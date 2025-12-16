import { lazy, Suspense, useMemo } from 'react'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import {
	StablecoinAssetInfo,
	useStablecoinAssetChartData,
	useStablecoinAssetsList
} from '~/containers/ProDashboard/components/datasets/StablecoinAssetDataset/useStablecoinAssetChartData'
import {
	StablecoinChainInfo,
	useStablecoinChainsList,
	useStablecoinsChartData
} from '~/containers/ProDashboard/components/datasets/StablecoinsDataset/useStablecoinsChartData'
import { colorManager, STABLECOIN_TOKEN_COLORS } from '~/containers/ProDashboard/utils/colorManager'
import { chainIconUrl, formattedNum, slug, tokenIconUrl } from '~/utils'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, VirtualizedSelectOption } from '../AriakitVirtualizedSelect'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface StablecoinsChartTabProps {
	selectedStablecoinChain: string
	selectedStablecoinChartType: string
	stablecoinMode: 'chain' | 'asset'
	selectedStablecoinAsset: string | null
	selectedStablecoinAssetId: string | null
	selectedStablecoinAssetChartType: string
	onSelectedStablecoinChainChange: (chain: string) => void
	onSelectedStablecoinChartTypeChange: (chartType: string) => void
	onStablecoinModeChange: (mode: 'chain' | 'asset') => void
	onSelectedStablecoinAssetChange: (asset: string | null) => void
	onSelectedStablecoinAssetIdChange: (id: string | null) => void
	onSelectedStablecoinAssetChartTypeChange: (chartType: string) => void
}

const STABLECOIN_CHAIN_CHART_TYPES = [
	{ value: 'totalMcap', label: 'Total Market Cap' },
	{ value: 'tokenMcaps', label: 'Token Market Caps' },
	{ value: 'pie', label: 'Pie' },
	{ value: 'dominance', label: 'Dominance' },
	{ value: 'usdInflows', label: 'USD Inflows' },
	{ value: 'tokenInflows', label: 'Token Inflows' }
]

const STABLECOIN_ASSET_CHART_TYPES = [
	{ value: 'totalCirc', label: 'Total Circulating' },
	{ value: 'chainMcaps', label: 'By Chain' },
	{ value: 'chainPie', label: 'Pie' },
	{ value: 'chainDominance', label: 'Chain Dominance' }
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
const CIRC_STACKS = ['Circulating']
const EMPTY_HALLMARKS: [number, string][] = []

export function StablecoinsChartTab({
	selectedStablecoinChain,
	selectedStablecoinChartType,
	stablecoinMode,
	selectedStablecoinAsset,
	selectedStablecoinAssetId,
	selectedStablecoinAssetChartType,
	onSelectedStablecoinChainChange,
	onSelectedStablecoinChartTypeChange,
	onStablecoinModeChange,
	onSelectedStablecoinAssetChange,
	onSelectedStablecoinAssetIdChange,
	onSelectedStablecoinAssetChartTypeChange
}: StablecoinsChartTabProps) {
	const { data: chainsList = [], isLoading: chainsLoading } = useStablecoinChainsList()
	const { data: assetsList = [], isLoading: assetsLoading } = useStablecoinAssetsList()

	const chainOptions: VirtualizedSelectOption[] = useMemo(() => {
		const options: VirtualizedSelectOption[] = [{ value: 'All', label: 'All Chains', icon: '🌐' }]
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

	const assetOptions: VirtualizedSelectOption[] = useMemo(() => {
		return (assetsList as StablecoinAssetInfo[]).map((asset) => ({
			value: asset.name,
			label: `${asset.name} (${asset.symbol})`,
			logo: tokenIconUrl(asset.geckoId),
			description: formattedNum(asset.mcap, true),
			extra: slug(asset.name)
		}))
	}, [assetsList])

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
		isLoading: chainChartDataLoading
	} = useStablecoinsChartData(stablecoinMode === 'chain' ? selectedStablecoinChain : 'All')

	const {
		peggedAreaTotalData: assetAreaTotalData,
		peggedAreaChartData: assetAreaChartData,
		chainsCirculatingValues: assetChainsCirculatingValues,
		dataWithExtraPeggedAndDominanceByDay: assetDominanceData,
		chainsUnique,
		stablecoinName,
		stablecoinSymbol,
		totalCirculating,
		isLoading: assetChartDataLoading
	} = useStablecoinAssetChartData(stablecoinMode === 'asset' ? selectedStablecoinAssetId || '' : '')

	const assetChainColors = useMemo(() => {
		const colors: Record<string, string> = {}
		chainsUnique.forEach((chain) => {
			colors[chain] = colorManager.getItemColor(chain, 'chain')
		})
		return colors
	}, [chainsUnique])

	const isLoading =
		chainsLoading || assetsLoading || (stablecoinMode === 'chain' ? chainChartDataLoading : assetChartDataLoading)

	const chartTypeLabel =
		stablecoinMode === 'chain'
			? STABLECOIN_CHAIN_CHART_TYPES.find((t) => t.value === selectedStablecoinChartType)?.label || ''
			: STABLECOIN_ASSET_CHART_TYPES.find((t) => t.value === selectedStablecoinAssetChartType)?.label || ''

	const handleAssetChange = (option: VirtualizedSelectOption) => {
		onSelectedStablecoinAssetChange(option.value)
		onSelectedStablecoinAssetIdChange(option.extra as string)
	}

	const renderChainChart = () => {
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

	const renderAssetChart = () => {
		if (isLoading) {
			return (
				<div className="flex h-[320px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}

		switch (selectedStablecoinAssetChartType) {
			case 'totalCirc':
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
							chartData={assetAreaTotalData}
							stacks={CIRC_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hallmarks={EMPTY_HALLMARKS}
							color="#4f8fea"
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'chainMcaps':
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
							chartData={assetAreaChartData}
							stacks={chainsUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							stackColors={assetChainColors}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'chainPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={assetChainsCirculatingValues} stackColors={assetChainColors} />
					</Suspense>
				)
			case 'chainDominance':
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
							chartData={assetDominanceData}
							stacks={chainsUnique}
							hideDefaultLegend={true}
							hideGradient={true}
							expandTo100Percent={true}
							stackColors={assetChainColors}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasChainSelection = selectedStablecoinChain
	const hasAssetSelection = selectedStablecoinAsset && selectedStablecoinAssetId

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-3">
				<div className="flex rounded-md border border-(--cards-border) bg-(--cards-bg-alt)/40 p-0.5">
					<button
						type="button"
						onClick={() => onStablecoinModeChange('chain')}
						className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
							stablecoinMode === 'chain'
								? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
								: 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						By Chain
					</button>
					<button
						type="button"
						onClick={() => onStablecoinModeChange('asset')}
						className={`flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all ${
							stablecoinMode === 'asset'
								? 'bg-(--cards-bg) text-(--text-primary) shadow-sm'
								: 'text-(--text-secondary) hover:text-(--text-primary)'
						}`}
					>
						By Asset
					</button>
				</div>

				{stablecoinMode === 'chain' ? (
					<>
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
							options={STABLECOIN_CHAIN_CHART_TYPES}
							selectedValue={selectedStablecoinChartType}
							onChange={(option) => onSelectedStablecoinChartTypeChange(option.value)}
							placeholder="Select chart type..."
						/>
					</>
				) : (
					<>
						<AriakitVirtualizedSelect
							label="Stablecoin"
							options={assetOptions}
							selectedValue={selectedStablecoinAsset || ''}
							onChange={handleAssetChange}
							placeholder="Select stablecoin..."
							isLoading={assetsLoading}
						/>

						<AriakitSelect
							label="Chart Type"
							options={STABLECOIN_ASSET_CHART_TYPES}
							selectedValue={selectedStablecoinAssetChartType}
							onChange={(option) => onSelectedStablecoinAssetChartTypeChange(option.value)}
							placeholder="Select chart type..."
						/>
					</>
				)}

				<div className="pro-text3 text-xs">
					{stablecoinMode === 'chain' && totalMcapCurrent !== null && (
						<p>
							Total Market Cap: <span className="pro-text1 font-semibold">{formattedNum(totalMcapCurrent, true)}</span>
						</p>
					)}
					{stablecoinMode === 'asset' && totalCirculating !== null && (
						<p>
							Total Circulating: <span className="pro-text1 font-semibold">{formattedNum(totalCirculating, true)}</span>
						</p>
					)}
				</div>
			</div>

			<div className="pro-border overflow-hidden rounded-lg border">
				<div className="pro-text2 border-b border-(--cards-border) px-3 py-2 text-xs font-medium">Preview</div>

				{(stablecoinMode === 'chain' && hasChainSelection) || (stablecoinMode === 'asset' && hasAssetSelection) ? (
					<div className="bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="pro-text1 mb-1 text-sm font-semibold">
								{stablecoinMode === 'chain'
									? `${selectedStablecoinChain === 'All' ? 'All Chains' : selectedStablecoinChain} - ${chartTypeLabel}`
									: `${stablecoinName || selectedStablecoinAsset}${stablecoinSymbol ? ` (${stablecoinSymbol})` : ''} - ${chartTypeLabel}`}
							</h3>
							<p className="pro-text2 text-xs">
								{stablecoinMode === 'chain' ? 'Stablecoins Market Cap' : 'Circulating by Chain'}
							</p>
						</div>

						<div className="h-[320px]">{stablecoinMode === 'chain' ? renderChainChart() : renderAssetChart()}</div>
					</div>
				) : (
					<div className="pro-text3 flex h-[320px] items-center justify-center text-center">
						<div>
							<Icon name="dollar-sign" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">
								{stablecoinMode === 'chain'
									? 'Select a chain and chart type to see preview'
									: 'Select a stablecoin and chart type to see preview'}
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
