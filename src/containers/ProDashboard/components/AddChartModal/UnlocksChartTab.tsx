import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, useEffect, useMemo } from 'react'
import { getAllProtocolEmissions, getProtocolEmissons } from '~/api/categories/protocols'
import type { IChartProps, IPieChartProps, ISingleSeriesChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { slug, toNiceDayMonthYear } from '~/utils'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, VirtualizedSelectOption } from '../AriakitVirtualizedSelect'

const UnlocksChart = lazy(() => import('~/components/ECharts/UnlocksChart')) as React.FC<IChartProps>
const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

interface UnlocksChartTabProps {
	selectedUnlocksProtocol: string | null
	selectedUnlocksProtocolName: string | null
	selectedUnlocksChartType: 'total' | 'schedule' | 'allocation' | 'locked-unlocked'
	onSelectedUnlocksProtocolChange: (protocol: string | null) => void
	onSelectedUnlocksProtocolNameChange: (name: string | null) => void
	onSelectedUnlocksChartTypeChange: (type: 'total' | 'schedule' | 'allocation' | 'locked-unlocked') => void
	protocolOptions: VirtualizedSelectOption[]
	protocolsLoading: boolean
}

const UNLOCKS_CHART_TYPES = [
	{ value: 'total', label: 'Total Unlocks' },
	{ value: 'schedule', label: 'Unlocks Schedule' },
	{ value: 'allocation', label: 'Allocation' },
	{ value: 'locked-unlocked', label: 'Locked/Unlocked %' }
]

const EMPTY_CHART_DATA: any[] = []
const EMPTY_STACKS: string[] = []
const LOCKED_UNLOCKED_COLORS = {
	Unlocked: '#0c5dff',
	Locked: '#ff4e21'
}

export function UnlocksChartTab({
	selectedUnlocksProtocol,
	selectedUnlocksProtocolName,
	selectedUnlocksChartType,
	onSelectedUnlocksProtocolChange,
	onSelectedUnlocksProtocolNameChange,
	onSelectedUnlocksChartTypeChange,
	protocolOptions,
	protocolsLoading
}: UnlocksChartTabProps) {
	const unlocksEndDate = useMemo(() => Date.now() / 1000 + 30 * 24 * 60 * 60, [])
	const todayTimestamp = useMemo(() => Math.floor(Date.now() / 1000), [])
	const todayHallmarks = useMemo<[number, string][]>(
		() => [[todayTimestamp, toNiceDayMonthYear(todayTimestamp)]],
		[todayTimestamp]
	)
	const { data: unlocksProtocols, isLoading: unlocksProtocolsLoading } = useQuery({
		queryKey: ['unlocks-protocols', unlocksEndDate],
		queryFn: () => getAllProtocolEmissions({ endDate: unlocksEndDate }),
		staleTime: 60 * 60 * 1000
	})

	const protocolLogoBySlug = useMemo(() => {
		const map = new Map<string, string>()
		for (const option of protocolOptions) {
			if (option.logo) {
				map.set(option.value, option.logo)
			}
		}
		return map
	}, [protocolOptions])

	const unlocksProtocolOptions = useMemo(() => {
		const map = new Map<string, VirtualizedSelectOption>()
		for (const protocol of unlocksProtocols || []) {
			if (!protocol?.name) continue
			const value = slug(protocol.name)
			if (!value) continue
			if (!map.has(value)) {
				map.set(value, {
					value,
					label: protocol.name,
					logo: protocolLogoBySlug.get(value)
				})
			}
		}
		if (selectedUnlocksProtocol && !map.has(selectedUnlocksProtocol)) {
			map.set(selectedUnlocksProtocol, {
				value: selectedUnlocksProtocol,
				label: selectedUnlocksProtocolName || selectedUnlocksProtocol
			})
		}
		return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
	}, [unlocksProtocols, protocolLogoBySlug, selectedUnlocksProtocol, selectedUnlocksProtocolName])

	const { data, isLoading } = useQuery({
		queryKey: ['unlocks-preview', selectedUnlocksProtocol],
		queryFn: () => getProtocolEmissons(slug(selectedUnlocksProtocol || '')),
		enabled: Boolean(selectedUnlocksProtocol),
		staleTime: 60 * 60 * 1000
	})

	const chartData = useMemo(() => {
		return data?.chartData?.documented ?? EMPTY_CHART_DATA
	}, [data])

	const stacks = useMemo(() => {
		const categories = data?.categories?.documented ?? EMPTY_STACKS
		if (categories.length > 0) return categories
		const first = chartData[0]
		if (!first || typeof first !== 'object') return EMPTY_STACKS
		return Object.keys(first).filter((key) => key !== 'date')
	}, [data, chartData])

	const stackColors = useMemo(() => {
		return data?.stackColors?.documented ?? {}
	}, [data])

	const allocationPieChartData = useMemo(() => {
		const pieData = data?.pieChartData?.documented ?? EMPTY_CHART_DATA
		return pieData
			.map((item: any) => ({ name: item?.name, value: Number(item?.value) }))
			.filter((item: any) => item.name && Number.isFinite(item.value) && item.value > 0)
	}, [data])

	const allocationPieChartColors = useMemo(() => {
		return data?.stackColors?.documented ?? {}
	}, [data])

	const unlockedPercent = useMemo(() => {
		const totalLocked = data?.meta?.totalLocked
		const maxSupply = data?.meta?.maxSupply
		if (totalLocked == null || maxSupply == null) return null
		const totalLockedValue = Number(totalLocked)
		const maxSupplyValue = Number(maxSupply)
		if (!Number.isFinite(totalLockedValue) || !Number.isFinite(maxSupplyValue) || maxSupplyValue === 0) return null
		const percent = 100 - (totalLockedValue / maxSupplyValue) * 100
		return Math.min(100, Math.max(0, percent))
	}, [data])

	const lockedUnlockedPieChartData = useMemo(
		() =>
			unlockedPercent == null
				? []
				: [
						{ name: 'Unlocked', value: unlockedPercent },
						{ name: 'Locked', value: 100 - unlockedPercent }
					],
		[unlockedPercent]
	)

	const totalSeries = useMemo(() => {
		if (!chartData || chartData.length === 0) return []
		const result: [number, number][] = []
		for (const entry of chartData) {
			if (!entry || typeof entry !== 'object') continue
			const { date, ...rest } = entry as { date?: string | number }
			const timestamp = Number(date)
			if (!Number.isFinite(timestamp)) continue
			let total = 0
			for (const key in rest) {
				total += Number((rest as Record<string, number>)[key] ?? 0)
			}
			result.push([timestamp, total])
		}
		return result
	}, [chartData])

	const availableChartTypes = useMemo(() => {
		const available = new Set<'total' | 'schedule' | 'allocation' | 'locked-unlocked'>()
		if (totalSeries.length > 0) available.add('total')
		if (chartData.length > 0 && stacks.length > 0) available.add('schedule')
		if (allocationPieChartData.length > 0) available.add('allocation')
		if (lockedUnlockedPieChartData.length > 0) available.add('locked-unlocked')
		return available
	}, [
		totalSeries.length,
		chartData.length,
		stacks.length,
		allocationPieChartData.length,
		lockedUnlockedPieChartData.length
	])

	const chartTypeOptions = useMemo(
		() =>
			UNLOCKS_CHART_TYPES.map((type) => ({
				...type,
				disabled: !availableChartTypes.has(type.value as 'total' | 'schedule' | 'allocation' | 'locked-unlocked')
			})),
		[availableChartTypes]
	)

	useEffect(() => {
		if (!availableChartTypes.has(selectedUnlocksChartType)) {
			const nextType = UNLOCKS_CHART_TYPES.find((type) =>
				availableChartTypes.has(type.value as 'total' | 'schedule' | 'allocation' | 'locked-unlocked')
			)
			if (nextType) {
				onSelectedUnlocksChartTypeChange(nextType.value as 'total' | 'schedule' | 'allocation' | 'locked-unlocked')
			}
		}
	}, [availableChartTypes, selectedUnlocksChartType, onSelectedUnlocksChartTypeChange])

	const handleProtocolChange = (option: VirtualizedSelectOption) => {
		onSelectedUnlocksProtocolChange(option.value)
		onSelectedUnlocksProtocolNameChange(option.label)
		onSelectedUnlocksChartTypeChange('total')
	}

	const hasSelection = Boolean(selectedUnlocksProtocol)
	const previewTitle = selectedUnlocksProtocolName || selectedUnlocksProtocol || ''
	const selectedChartLabel = UNLOCKS_CHART_TYPES.find((t) => t.value === selectedUnlocksChartType)?.label || ''

	const renderChart = () => {
		if (isLoading) {
			return (
				<div className="flex h-[320px] items-center justify-center">
					<LocalLoader />
				</div>
			)
		}

		if (selectedUnlocksChartType === 'total') {
			if (totalSeries.length === 0) {
				return <div className="pro-text3 flex h-[320px] items-center justify-center text-center">No unlocks data.</div>
			}
			return (
				<Suspense fallback={<div className="h-[320px]" />}>
					<SingleSeriesChart
						chartType="line"
						chartData={totalSeries}
						valueSymbol="$"
						hideDataZoom
						hallmarks={todayHallmarks}
					/>
				</Suspense>
			)
		}

		if (selectedUnlocksChartType === 'schedule') {
			if (chartData.length === 0 || stacks.length === 0) {
				return <div className="pro-text3 flex h-[320px] items-center justify-center text-center">No unlocks data.</div>
			}

			return (
				<Suspense fallback={<div className="h-[320px]" />}>
					<UnlocksChart
						chartData={chartData}
						stacks={stacks}
						stackColors={stackColors}
						customLegendName="Category"
						customLegendOptions={stacks}
						isStackedChart
						hideDataZoom
						hallmarks={todayHallmarks}
					/>
				</Suspense>
			)
		}

		if (selectedUnlocksChartType === 'allocation') {
			if (allocationPieChartData.length === 0) {
				return <div className="pro-text3 flex h-[320px] items-center justify-center text-center">No unlocks data.</div>
			}
			return (
				<Suspense fallback={<div className="h-[320px]" />}>
					<PieChart chartData={allocationPieChartData} stackColors={allocationPieChartColors} />
				</Suspense>
			)
		}

		if (selectedUnlocksChartType === 'locked-unlocked') {
			if (lockedUnlockedPieChartData.length === 0) {
				return <div className="pro-text3 flex h-[320px] items-center justify-center text-center">No unlocks data.</div>
			}
			return (
				<Suspense fallback={<div className="h-[320px]" />}>
					<PieChart chartData={lockedUnlockedPieChartData} stackColors={LOCKED_UNLOCKED_COLORS} valueSymbol="%" />
				</Suspense>
			)
		}

		return <div className="pro-text3 flex h-[320px] items-center justify-center text-center">No unlocks data.</div>
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="space-y-3">
				<AriakitVirtualizedSelect
					label="Protocol"
					options={unlocksProtocolOptions}
					selectedValue={selectedUnlocksProtocol || ''}
					onChange={handleProtocolChange}
					placeholder="Select protocol..."
					isLoading={protocolsLoading || unlocksProtocolsLoading}
				/>

				<div className={`grid grid-cols-1 gap-3 ${!hasSelection ? 'pointer-events-none opacity-50' : ''}`}>
					<AriakitSelect
						label="Chart Type"
						options={chartTypeOptions}
						selectedValue={selectedUnlocksChartType}
						onChange={(option) =>
							onSelectedUnlocksChartTypeChange(option.value as 'total' | 'schedule' | 'allocation' | 'locked-unlocked')
						}
						placeholder="Select chart type..."
					/>
				</div>

				{hasSelection && !isLoading && availableChartTypes.size === 0 && (
					<div className="pro-text3 text-xs">No unlocks data available for this protocol.</div>
				)}
			</div>

			<div className="pro-border overflow-hidden rounded-lg border">
				<div className="pro-text2 border-b border-(--cards-border) px-3 py-2 text-xs font-medium">Preview</div>
				{hasSelection ? (
					<div className="bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="pro-text1 mb-1 text-sm font-semibold">
								{previewTitle} - {selectedChartLabel}
							</h3>
							<p className="pro-text2 text-xs">Unlocks</p>
						</div>
						{renderChart()}
					</div>
				) : (
					<div className="pro-text3 flex h-[320px] items-center justify-center text-center">
						<div>
							<Icon name="linear-unlock" height={32} width={32} className="mx-auto mb-1" />
							<div className="text-xs">Select a protocol to preview unlocks</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
