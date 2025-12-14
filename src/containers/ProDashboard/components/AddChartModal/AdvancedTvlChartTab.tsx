import { lazy, Suspense, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { IBarChartProps, IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import { oldBlue } from '~/constants/colors'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatTvlsByChain, useFetchProtocolAddlChartsData } from '~/containers/ProtocolOverview/utils'
import ProtocolCharts from '../../services/ProtocolCharts'
import { useProDashboard } from '../../ProDashboardAPIContext'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, VirtualizedSelectOption } from '../AriakitVirtualizedSelect'
import { ChartTabType } from './types'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface AdvancedTvlChartTabProps {
	selectedAdvancedTvlProtocol: string | null
	selectedAdvancedTvlProtocolName: string | null
	selectedAdvancedTvlChartType: string
	onSelectedAdvancedTvlProtocolChange: (protocol: string | null) => void
	onSelectedAdvancedTvlProtocolNameChange: (name: string | null) => void
	onSelectedAdvancedTvlChartTypeChange: (chartType: string) => void
	onChartTabChange: (tab: ChartTabType) => void
	protocolOptions: VirtualizedSelectOption[]
	protocolsLoading: boolean
}

const ADVANCED_TVL_CHART_TYPES = [
	{ value: 'tvl', label: 'TVL' },
	{ value: 'chainsTvl', label: 'TVL by Chains' },
	{ value: 'tokenValuesUsd', label: 'Token Values (USD)' },
	{ value: 'tokensPie', label: 'Tokens Breakdown' },
	{ value: 'tokenBalances', label: 'Token Balances (Raw)' },
	{ value: 'usdInflows', label: 'USD Inflows' },
	{ value: 'tokenInflows', label: 'Inflows by Token' }
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

const TVL_STACKS = ['TVL']
const EMPTY_HALLMARKS: [number, string][] = []

export function AdvancedTvlChartTab({
	selectedAdvancedTvlProtocol,
	selectedAdvancedTvlProtocolName,
	selectedAdvancedTvlChartType,
	onSelectedAdvancedTvlProtocolChange,
	onSelectedAdvancedTvlProtocolNameChange,
	onSelectedAdvancedTvlChartTypeChange,
	onChartTabChange,
	protocolOptions,
	protocolsLoading
}: AdvancedTvlChartTabProps) {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl_fees')
	const { protocols } = useProDashboard()

	const filteredProtocolOptions = useMemo(() => {
		const parentIds = new Set(
			protocols.filter((p: any) => p.parentProtocol).map((p: any) => p.parentProtocol)
		)
		const parentIdToSlug = new Map(
			protocols.filter((p: any) => parentIds.has(p.id)).map((p: any) => [p.id, p.slug])
		)
		const parentSlugs = new Set(parentIdToSlug.values())
		return protocolOptions
			.filter((opt: any) => !parentSlugs.has(opt.value))
			.map((opt: any) => ({ ...opt, isChild: false }))
	}, [protocolOptions, protocols])

	const { data: basicTvlData, isLoading: isBasicTvlLoading } = useQuery({
		queryKey: ['advanced-tvl-preview-basic', selectedAdvancedTvlProtocol],
		queryFn: () => ProtocolCharts.tvl(selectedAdvancedTvlProtocol!),
		enabled: !!selectedAdvancedTvlProtocol && selectedAdvancedTvlChartType === 'tvl',
		staleTime: 60 * 60 * 1000
	})

	const {
		data: addlData,
		historicalChainTvls,
		isLoading: isAddlLoading
	} = useFetchProtocolAddlChartsData(selectedAdvancedTvlProtocolName || '')

	const { chainsSplit, chainsUnique } = useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatTvlsByChain({ historicalChainTvls, extraTvlsEnabled })
		const chainsUnique = Object.keys(chainsSplit[chainsSplit.length - 1] ?? {}).filter((c) => c !== 'date')
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls, extraTvlsEnabled])

	const { tokensUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown, usdInflows, tokenInflows } =
		addlData ?? {}

	const availableChartTypes = useMemo(() => {
		const available = new Set<string>(['tvl'])

		if (chainsSplit && chainsUnique?.length > 1) {
			available.add('chainsTvl')
		}
		if (tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0) {
			available.add('tokenValuesUsd')
		}
		if (tokenBreakdownPieChart?.length > 0) {
			available.add('tokensPie')
		}
		if (tokenBreakdown?.length > 1 && tokensUnique?.length > 0) {
			available.add('tokenBalances')
		}
		if (usdInflows?.length > 0) {
			available.add('usdInflows')
		}
		if (tokenInflows?.length > 0 && tokensUnique?.length > 0) {
			available.add('tokenInflows')
		}

		return available
	}, [chainsSplit, chainsUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown, tokensUnique, usdInflows, tokenInflows])

	const chartTypeOptions = useMemo(() => {
		return ADVANCED_TVL_CHART_TYPES.map((type) => ({
			...type,
			disabled: !availableChartTypes.has(type.value)
		}))
	}, [availableChartTypes])

	const isLoading = selectedAdvancedTvlChartType === 'tvl' ? isBasicTvlLoading : isAddlLoading

	const handleProtocolChange = (option: VirtualizedSelectOption) => {
		onSelectedAdvancedTvlProtocolChange(option.value)
		onSelectedAdvancedTvlProtocolNameChange(option.label)
		onSelectedAdvancedTvlChartTypeChange('tvl')
	}

	const chartTypeLabel = ADVANCED_TVL_CHART_TYPES.find((t) => t.value === selectedAdvancedTvlChartType)?.label || ''

	const renderChart = () => {
		if (isLoading) {
			return (
				<div className="flex h-[320px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}

		switch (selectedAdvancedTvlChartType) {
			case 'tvl': {
				const tvlData = basicTvlData?.map(([ts, val]) => ({ date: ts, TVL: val })) ?? []
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
							chartData={tvlData}
							stacks={TVL_STACKS}
							valueSymbol="$"
							hideDefaultLegend={true}
							hallmarks={EMPTY_HALLMARKS}
							color={oldBlue}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			}
			case 'chainsTvl':
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
							chartData={chainsSplit ?? []}
							stacks={chainsUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'tokenValuesUsd':
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
							chartData={tokenBreakdownUSD ?? []}
							stacks={tokensUnique ?? []}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							chartOptions={chartOptions}
						/>
					</Suspense>
				)
			case 'tokensPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={tokenBreakdownPieChart ?? []} />
					</Suspense>
				)
			case 'tokenBalances':
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
							chartData={tokenBreakdown ?? []}
							stacks={tokensUnique ?? []}
							hideDefaultLegend={true}
							hideGradient={true}
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
						<BarChart
							chartData={usdInflows ?? []}
							color={oldBlue}
							title=""
							chartOptions={inflowsChartOptions}
						/>
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
							chartData={tokenInflows ?? []}
							title=""
							hideDefaultLegend={true}
							customLegendName="Token"
							customLegendOptions={tokensUnique ?? []}
							chartOptions={inflowsChartOptions}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	const hasProtocolSelection = selectedAdvancedTvlProtocol && selectedAdvancedTvlProtocolName

	return (
		<div className="flex h-full min-h-[400px] gap-3 overflow-hidden">
			<div className="pro-border flex w-[380px] flex-col border lg:w-[420px]">
				<div className="flex h-full flex-col p-3">
					<AriakitSelect
						label="Category"
						options={[
							{ value: 'chain', label: 'Protocols/Chains' },
							{ value: 'yields', label: 'Yields' },
							{ value: 'stablecoins', label: 'Stablecoins' },
							{ value: 'advanced-tvl', label: 'Advanced TVL' }
						]}
						selectedValue="advanced-tvl"
						onChange={(option) => onChartTabChange(option.value as ChartTabType)}
						className="mb-3"
					/>

					<div className="mb-3 flex-shrink-0 space-y-2">
						<AriakitVirtualizedSelect
							label="Protocol"
							options={filteredProtocolOptions}
							selectedValue={selectedAdvancedTvlProtocol || ''}
							onChange={handleProtocolChange}
							placeholder="Select protocol..."
							isLoading={protocolsLoading}
						/>

						<Tooltip content={!hasProtocolSelection ? 'Select protocol first' : null} className="w-full">
							<div className={`w-full ${!hasProtocolSelection ? 'pointer-events-none opacity-50' : ''}`}>
								<AriakitSelect
									label="Chart Type"
									options={chartTypeOptions}
									selectedValue={selectedAdvancedTvlChartType}
									onChange={(option) => onSelectedAdvancedTvlChartTypeChange(option.value)}
									placeholder="Select chart type..."
								/>
							</div>
						</Tooltip>
					</div>

					{hasProtocolSelection && isAddlLoading && (
						<div className="pro-text3 text-xs">Loading available chart types...</div>
					)}

					{hasProtocolSelection && !isAddlLoading && (
						<div className="pro-text3 mt-auto text-xs">
							<p>
								Available charts: <span className="pro-text1 font-semibold">{availableChartTypes.size}</span>
							</p>
						</div>
					)}
				</div>
			</div>

			<div className="pro-border flex flex-1 flex-col overflow-hidden border">
				<div className="pro-text2 flex-shrink-0 px-3 py-2 text-xs font-medium">Preview</div>

				{hasProtocolSelection ? (
					<div className="min-h-0 flex-1 overflow-auto rounded-md bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="pro-text1 mb-1 text-sm font-semibold">
								{selectedAdvancedTvlProtocolName} - {chartTypeLabel}
							</h3>
							<p className="pro-text2 text-xs">Advanced TVL Chart</p>
						</div>

						<div className="min-h-[320px]">{renderChart()}</div>
					</div>
				) : (
					<div className="pro-text3 flex flex-1 items-center justify-center text-center">
						<div>
							<Icon name="trending-up" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a protocol to see available TVL charts</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
