import { lazy, Suspense, useEffect, useMemo } from 'react'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { Tooltip } from '~/components/Tooltip'
import {
	formatProtocolV1TvlsByChain,
	useFetchProtocolV1AddlChartsData
} from '~/containers/ProtocolOverview/protocolV1AddlChartsData'
import { BORROWED_CHART_OPTIONS, BORROWED_CHART_TYPES } from '../../borrowedChartConstants'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, type VirtualizedSelectOption } from '../AriakitVirtualizedSelect'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const BORROWED_CHART_TYPE_LABELS = new Map<string, string>()
for (const chartType of BORROWED_CHART_TYPES) {
	BORROWED_CHART_TYPE_LABELS.set(chartType.value, chartType.label)
}
const EMPTY_CHART_DATA: any[] = []
const EMPTY_STACKS: string[] = []
const EMPTY_ADDL_DATA: {
	tokensUnique?: string[]
	tokenBreakdownUSD?: any[]
	tokenBreakdownPieChart?: any[]
	tokenBreakdown?: any[]
} = {}

interface BorrowedChartTabProps {
	selectedBorrowedProtocol: string | null
	selectedBorrowedProtocolName: string | null
	selectedBorrowedChartType: string
	onSelectedBorrowedProtocolChange: (protocol: string | null) => void
	onSelectedBorrowedProtocolNameChange: (name: string | null) => void
	onSelectedBorrowedChartTypeChange: (chartType: string) => void
	protocolOptions: VirtualizedSelectOption[]
	protocolsLoading: boolean
}

export function BorrowedChartTab({
	selectedBorrowedProtocol,
	selectedBorrowedProtocolName,
	selectedBorrowedChartType,
	onSelectedBorrowedProtocolChange,
	onSelectedBorrowedProtocolNameChange,
	onSelectedBorrowedChartTypeChange,
	protocolOptions,
	protocolsLoading
}: BorrowedChartTabProps) {
	const { protocols } = useProDashboardCatalog()

	const filteredProtocolOptions = useMemo(() => {
		const parentIds = new Set(protocols.filter((p: any) => p.parentProtocol).map((p: any) => p.parentProtocol))
		const parentIdToSlug = new Map(protocols.filter((p: any) => parentIds.has(p.id)).map((p: any) => [p.id, p.slug]))
		const parentSlugs = new Set(parentIdToSlug.values())
		return protocolOptions
			.filter((opt: any) => !parentSlugs.has(opt.value))
			.map((opt: any) => ({ ...opt, isChild: false }))
	}, [protocolOptions, protocols])

	const {
		data: addlData,
		historicalChainTvls,
		isLoading: isAddlLoading
	} = useFetchProtocolV1AddlChartsData(selectedBorrowedProtocolName || '', true)

	const { chainsSplit, chainsUnique } = useMemo(() => {
		if (!historicalChainTvls) return { chainsSplit: null, chainsUnique: [] }
		const chainsSplit = formatProtocolV1TvlsByChain({ historicalChainTvls, extraTvlsEnabled: {} })
		const lastEntry = chainsSplit[chainsSplit.length - 1] ?? {}
		const chainsUnique: string[] = []
		for (const key in lastEntry) {
			if (key !== 'date') chainsUnique.push(key)
		}
		return { chainsSplit, chainsUnique }
	}, [historicalChainTvls])

	const { tokensUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown } = addlData ?? EMPTY_ADDL_DATA
	const resolvedTokensUnique = tokensUnique ?? EMPTY_STACKS
	const resolvedTokenBreakdownUSD = tokenBreakdownUSD ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdownPieChart = tokenBreakdownPieChart ?? EMPTY_CHART_DATA
	const resolvedTokenBreakdown = tokenBreakdown ?? EMPTY_CHART_DATA
	const resolvedChainsSplit = chainsSplit ?? EMPTY_CHART_DATA

	const availableChartTypes = useMemo(() => {
		const available = new Set<string>()

		if (chainsSplit && chainsUnique?.length > 1) {
			available.add('chainsBorrowed')
		}
		if (tokenBreakdownUSD?.length > 1 && tokensUnique?.length > 0) {
			available.add('tokenBorrowedUsd')
		}
		if (tokenBreakdownPieChart?.length > 0) {
			available.add('tokensBorrowedPie')
		}
		if (tokenBreakdown?.length > 1 && tokensUnique?.length > 0) {
			available.add('tokenBorrowedRaw')
		}

		return available
	}, [chainsSplit, chainsUnique, tokenBreakdownUSD, tokenBreakdownPieChart, tokenBreakdown, tokensUnique])

	const chartTypeOptions = useMemo(() => {
		return BORROWED_CHART_TYPES.map((type) => ({
			...type,
			disabled: !availableChartTypes.has(type.value)
		}))
	}, [availableChartTypes])

	const handleProtocolChange = (option: VirtualizedSelectOption) => {
		onSelectedBorrowedProtocolChange(option.value)
		onSelectedBorrowedProtocolNameChange(option.label)
		onSelectedBorrowedChartTypeChange('chainsBorrowed')
	}

	const hasProtocolSelection = selectedBorrowedProtocol && selectedBorrowedProtocolName

	useEffect(() => {
		if (!hasProtocolSelection) return

		if (availableChartTypes.size === 0) {
			if (selectedBorrowedChartType !== '') {
				onSelectedBorrowedChartTypeChange('')
			}
			return
		}

		if (!availableChartTypes.has(selectedBorrowedChartType)) {
			let nextChartType: string | undefined
			for (const chartType of BORROWED_CHART_TYPES) {
				if (availableChartTypes.has(chartType.value)) {
					nextChartType = chartType.value
					break
				}
			}
			if (nextChartType && nextChartType !== selectedBorrowedChartType) {
				onSelectedBorrowedChartTypeChange(nextChartType)
			}
		}
	}, [hasProtocolSelection, availableChartTypes, selectedBorrowedChartType, onSelectedBorrowedChartTypeChange])

	const chartTypeLabel = BORROWED_CHART_TYPE_LABELS.get(selectedBorrowedChartType) || ''
	const previewTitle = chartTypeLabel
		? `${selectedBorrowedProtocolName} - ${chartTypeLabel}`
		: selectedBorrowedProtocolName || ''

	const renderChart = () => {
		if (isAddlLoading) {
			return (
				<div className="flex h-[320px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}

		switch (selectedBorrowedChartType) {
			case 'chainsBorrowed':
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
							chartData={resolvedChainsSplit}
							stacks={chainsUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
						/>
					</Suspense>
				)
			case 'tokenBorrowedUsd':
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
							chartData={resolvedTokenBreakdownUSD}
							stacks={resolvedTokensUnique}
							valueSymbol="$"
							hideDefaultLegend={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
						/>
					</Suspense>
				)
			case 'tokensBorrowedPie':
				return (
					<Suspense
						fallback={
							<div className="flex h-[320px] items-center justify-center">
								<LocalLoader />
							</div>
						}
					>
						<PieChart chartData={resolvedTokenBreakdownPieChart} />
					</Suspense>
				)
			case 'tokenBorrowedRaw':
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
							chartData={resolvedTokenBreakdown}
							stacks={resolvedTokensUnique}
							hideDefaultLegend={true}
							hideGradient={true}
							chartOptions={BORROWED_CHART_OPTIONS}
						/>
					</Suspense>
				)
			default:
				return null
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-3">
				<AriakitVirtualizedSelect
					label="Protocol"
					options={filteredProtocolOptions}
					selectedValue={selectedBorrowedProtocol || ''}
					onChange={handleProtocolChange}
					placeholder="Select protocol..."
					isLoading={protocolsLoading}
				/>

				<Tooltip content={!hasProtocolSelection ? 'Select protocol first' : null} className="w-full">
					<div className={`w-full ${!hasProtocolSelection ? 'pointer-events-none opacity-50' : ''}`}>
						<AriakitSelect
							label="Chart Type"
							options={chartTypeOptions}
							selectedValue={selectedBorrowedChartType}
							onChange={(option) => onSelectedBorrowedChartTypeChange(option.value)}
							placeholder="Select chart type..."
						/>
					</div>
				</Tooltip>

				{hasProtocolSelection && isAddlLoading && (
					<div className="text-xs pro-text3">Loading available chart types...</div>
				)}

				{hasProtocolSelection && !isAddlLoading && availableChartTypes.size > 0 && (
					<div className="text-xs pro-text3">
						<p>
							Available charts: <span className="font-semibold pro-text1">{availableChartTypes.size}</span>
						</p>
					</div>
				)}

				{hasProtocolSelection && !isAddlLoading && availableChartTypes.size === 0 && (
					<div className="text-xs pro-text3">No borrowed data available for this protocol.</div>
				)}
			</div>

			<div className="overflow-hidden rounded-lg border pro-border">
				<div className="border-b border-(--cards-border) px-3 py-2 text-xs font-medium pro-text2">Preview</div>

				{hasProtocolSelection ? (
					<div className="bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="mb-1 text-sm font-semibold pro-text1">{previewTitle}</h3>
							<p className="text-xs pro-text2">Borrowed Chart</p>
						</div>

						{availableChartTypes.size === 0 && !isAddlLoading ? (
							<div className="flex h-[320px] items-center justify-center text-center pro-text3">
								No borrowed data available.
							</div>
						) : (
							<div className="h-[320px]">{renderChart()}</div>
						)}
					</div>
				) : (
					<div className="flex h-[320px] items-center justify-center text-center pro-text3">
						<div>
							<Icon name="trending-up" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a protocol to see available borrowed charts</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
