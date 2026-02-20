import { useQuery } from '@tanstack/react-query'
import { lazy, Suspense, type ReactNode, useEffect, useMemo, useState } from 'react'
import type {
	IMultiSeriesChart2Props,
	IPieChartProps,
	ISingleSeriesChartProps,
	MultiSeriesChart2Dataset
} from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { getAllProtocolEmissions, getProtocolEmissons } from '~/containers/Unlocks/queries'
import { slug, toNiceDayMonthYear } from '~/utils'
import { AriakitSelect } from '../AriakitSelect'
import { AriakitVirtualizedSelect, type VirtualizedSelectOption } from '../AriakitVirtualizedSelect'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

const EMPTY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp'] }

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
	const [unlocksEndDate] = useState(() => Date.now() / 1000 + 30 * 24 * 60 * 60)
	const [todayTimestamp] = useState(() => Math.floor(Date.now() / 1000))
	const todayHallmarks = useMemo<[number, string][]>(
		() => [[todayTimestamp, toNiceDayMonthYear(todayTimestamp)]],
		[todayTimestamp]
	)
	const { data: unlocksProtocols, isLoading: unlocksProtocolsLoading } = useQuery({
		queryKey: ['unlocks-protocols', unlocksEndDate],
		queryFn: () => getAllProtocolEmissions({ endDate: unlocksEndDate, getHistoricalPrices: false }),
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

	// Pre-built from the API — no need to reconstruct dataset/charts from scratch.
	const scheduleDataset = data?.datasets?.documented ?? EMPTY_DATASET
	const scheduleCharts = data?.chartsConfigs?.documented

	const stacks = useMemo(() => {
		if (scheduleDataset.dimensions.length > 1) return scheduleDataset.dimensions.slice(1)
		const categories = data?.categories?.documented ?? EMPTY_STACKS
		if (categories.length > 0) return categories
		return EMPTY_STACKS
	}, [scheduleDataset.dimensions, data])

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
		const source = scheduleDataset.source
		if (!source.length) return []
		const valueKeys = scheduleDataset.dimensions.filter((k) => k !== 'timestamp')
		const result: [number, number][] = []
		for (const entry of source) {
			const ts = entry.timestamp as number
			if (!Number.isFinite(ts)) continue
			let total = 0
			for (const key of valueKeys) total += Number(entry[key] ?? 0)
			// SingleSeriesChart expects [seconds, value]
			result.push([Math.floor(ts / 1e3), total])
		}
		return result
	}, [scheduleDataset])

	const availableChartTypes = useMemo(() => {
		const available = new Set<'total' | 'schedule' | 'allocation' | 'locked-unlocked'>()
		if (totalSeries.length > 0) available.add('total')
		if (scheduleDataset.source.length > 0 && stacks.length > 0) available.add('schedule')
		if (allocationPieChartData.length > 0) available.add('allocation')
		if (lockedUnlockedPieChartData.length > 0) available.add('locked-unlocked')
		return available
	}, [
		totalSeries.length,
		scheduleDataset.source.length,
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
	let chartContent: ReactNode
	if (isLoading) {
		chartContent = (
			<div className="flex h-[320px] items-center justify-center">
				<LocalLoader />
			</div>
		)
	} else if (selectedUnlocksChartType === 'total') {
		if (totalSeries.length === 0) {
			chartContent = <div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
		} else {
			chartContent = (
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
	} else if (selectedUnlocksChartType === 'schedule') {
		if (scheduleDataset.source.length === 0 || stacks.length === 0) {
			chartContent = <div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
		} else {
			chartContent = (
				<Suspense fallback={<div className="h-[320px]" />}>
					<MultiSeriesChart2
						dataset={scheduleDataset}
						charts={scheduleCharts}
						hideDataZoom
						hallmarks={todayHallmarks}
						valueSymbol=""
					/>
				</Suspense>
			)
		}
	} else if (selectedUnlocksChartType === 'allocation') {
		if (allocationPieChartData.length === 0) {
			chartContent = <div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
		} else {
			chartContent = (
				<Suspense fallback={<div className="h-[320px]" />}>
					<PieChart chartData={allocationPieChartData} stackColors={allocationPieChartColors} />
				</Suspense>
			)
		}
	} else if (selectedUnlocksChartType === 'locked-unlocked') {
		if (lockedUnlockedPieChartData.length === 0) {
			chartContent = <div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
		} else {
			chartContent = (
				<Suspense fallback={<div className="h-[320px]" />}>
					<PieChart chartData={lockedUnlockedPieChartData} stackColors={LOCKED_UNLOCKED_COLORS} valueSymbol="%" />
				</Suspense>
			)
		}
	} else {
		chartContent = <div className="flex h-[320px] items-center justify-center text-center pro-text3">No unlocks data.</div>
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
					<div className="text-xs pro-text3">No unlocks data available for this protocol.</div>
				)}
			</div>

			<div className="overflow-hidden rounded-lg border pro-border">
				<div className="border-b border-(--cards-border) px-3 py-2 text-xs font-medium pro-text2">Preview</div>
				{hasSelection ? (
					<div className="bg-(--cards-bg) p-3">
						<div className="mb-3">
							<h3 className="mb-1 text-sm font-semibold pro-text1">
								{previewTitle} - {selectedChartLabel}
							</h3>
							<p className="text-xs pro-text2">Unlocks</p>
						</div>
						{chartContent}
					</div>
				) : (
					<div className="flex h-[320px] items-center justify-center text-center pro-text3">
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
