import { lazy, memo, Suspense, useEffect, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { SortableItem } from '~/containers/ProtocolOverview/ProtocolPro'
import { useProDashboard } from '../ProDashboardAPIContext'
import { DashboardItemConfig, StoredColSpan } from '../types'
import type { UnifiedTableFocusSection } from './UnifiedTable/types'
import { ConfirmationModal } from './ConfirmationModal'
import {
	AggregatorsDataset,
	BridgeAggregatorsDataset,
	CexDataset,
	ChainsDataset,
	DexsDataset,
	EarningsDataset,
	FeesDataset,
	HoldersRevenueDataset,
	OptionsDataset,
	PerpsDataset,
	RevenueDataset,
	StablecoinsDataset,
	TokenUsageDataset,
	TrendingContractsDataset,
	YieldsDataset
} from './datasets'
import { ProtocolsByChainTable } from './ProTable'
import { Rating } from './Rating'
import { TextCard } from './TextCard'
import { YieldsChartCard } from './YieldsChartCard'

const ChartCard = lazy(() => import('./ChartCard').then((mod) => ({ default: mod.ChartCard })))
const MultiChartCard = lazy(() => import('./MultiChartCard'))
const ChartBuilderCard = lazy(() => import('./ChartBuilderCard').then((mod) => ({ default: mod.ChartBuilderCard })))
const MetricCard = lazy(() => import('./MetricCard').then((mod) => ({ default: mod.MetricCard })))
const UnifiedTable = lazy(() => import('./UnifiedTable'))
const StablecoinsChartCard = lazy(() =>
	import('./StablecoinsChartCard').then((mod) => ({ default: mod.StablecoinsChartCard }))
)
const StablecoinAssetChartCard = lazy(() =>
	import('./StablecoinAssetChartCard').then((mod) => ({ default: mod.StablecoinAssetChartCard }))
)

const STORED_COL_SPANS = [0.5, 1, 1.5, 2] as const satisfies readonly StoredColSpan[]
const METRIC_COL_SPANS = [0.5, 1] as const satisfies readonly StoredColSpan[]
const COL_SPAN_CLASS_MAP: Record<1 | 2 | 3 | 4, string> = {
	1: 'lg:col-span-1',
	2: 'lg:col-span-2',
	3: 'lg:col-span-3',
	4: 'lg:col-span-4'
}

const normalizeStoredColSpan = (span: StoredColSpan | undefined, fallback: StoredColSpan = 1): StoredColSpan =>
	(span ?? fallback) as StoredColSpan

const getEffectiveColSpan = (span?: StoredColSpan) => {
	const stored = normalizeStoredColSpan(span)
	return Math.round(stored * 2) as 1 | 2 | 3 | 4
}

const getPreviousStoredColSpan = (
	span: StoredColSpan,
	options: readonly StoredColSpan[] = STORED_COL_SPANS
): StoredColSpan => {
	const index = options.indexOf(span)
	if (index <= 0) {
		return options[0]
	}
	return options[index - 1]
}

const getNextStoredColSpan = (
	span: StoredColSpan,
	options: readonly StoredColSpan[] = STORED_COL_SPANS
): StoredColSpan => {
	const index = options.indexOf(span)
	if (index === -1 || index >= options.length - 1) {
		return options[options.length - 1]
	}
	return options[index + 1]
}

interface ChartGridProps {
	onAddChartClick: () => void
	onEditItem?: (item: DashboardItemConfig, focusSection?: UnifiedTableFocusSection) => void
}

export const ChartGrid = memo(function ChartGrid({ onAddChartClick, onEditItem }: ChartGridProps) {
	const {
		chartsWithData,
		handleChartsReordered,
		handleRemoveItem,
		handleColSpanChange,
		handleEditItem,
		isReadOnly,
		getCurrentRatingSession,
		autoSkipOlderSessionsForRating,
		submitRating,
		skipRating
	} = useProDashboard()
	const [deleteConfirmItem, setDeleteConfirmItem] = useState<string | null>(null)
	const [isSmallScreen, setIsSmallScreen] = useState(false)

	const currentRatingSession = getCurrentRatingSession()

	useEffect(() => {
		if (currentRatingSession) {
			autoSkipOlderSessionsForRating()
		}
	}, [currentRatingSession?.sessionId, autoSkipOlderSessionsForRating])

	useEffect(() => {
		const checkScreenSize = () => {
			setIsSmallScreen(window.innerWidth <= 768)
		}

		checkScreenSize()
		window.addEventListener('resize', checkScreenSize)

		return () => window.removeEventListener('resize', checkScreenSize)
	}, [])

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: isSmallScreen ? 999999 : 5
			}
		}),
		useSensor(KeyboardSensor)
	)

	const handleDragEnd = (event: any) => {
		const { active, over } = event

		if (over && active.id !== over.id) {
			const oldIndex = chartsWithData.findIndex((item) => item.id === active.id)
			const newIndex = chartsWithData.findIndex((item) => item.id === over.id)
			const newCharts = arrayMove(chartsWithData, oldIndex, newIndex)
			handleChartsReordered(newCharts)
		}
	}

	const handleDeleteClick = (itemId: string) => {
		setDeleteConfirmItem(itemId)
	}

	const handleConfirmDelete = () => {
		if (deleteConfirmItem) {
			handleRemoveItem(deleteConfirmItem)
			setDeleteConfirmItem(null)
		}
	}

	const handleCancelDelete = () => {
		setDeleteConfirmItem(null)
	}

	const renderItemContent = (item: DashboardItemConfig) => {
		if (item.kind === 'chart') {
			return (
				<Suspense fallback={<div className="flex min-h-[344px] flex-col p-1 md:min-h-[360px]" />}>
					<ChartCard chart={item} />
				</Suspense>
			)
		}

		if (item.kind === 'multi') {
			return (
				<Suspense fallback={<div className="flex min-h-[402px] flex-col p-1 md:min-h-[418px]" />}>
					<MultiChartCard key={`${item.id}-${item.items?.map((i) => i.id).join('-')}`} multi={item} />
				</Suspense>
			)
		}

		if (item.kind === 'metric') {
			return (
				<Suspense fallback={<div className="flex min-h-[140px] flex-col p-1" />}>
					<MetricCard metric={item as any} />
				</Suspense>
			)
		}

		if (item.kind === 'builder') {
			return (
				<Suspense fallback={<div className="flex min-h-[422px] flex-col p-1 md:min-h-[438px]" />}>
					<ChartBuilderCard builder={item} />
				</Suspense>
			)
		}

		if (item.kind === 'yields') {
			return <YieldsChartCard config={item} />
		}

		if (item.kind === 'stablecoins') {
			return (
				<Suspense fallback={<div className="flex min-h-[344px] flex-col p-1 md:min-h-[360px]" />}>
					<StablecoinsChartCard config={item} />
				</Suspense>
			)
		}

		if (item.kind === 'stablecoin-asset') {
			return (
				<Suspense fallback={<div className="flex min-h-[344px] flex-col p-1 md:min-h-[360px]" />}>
					<StablecoinAssetChartCard config={item} />
				</Suspense>
			)
		}

		if (item.kind === 'text') {
			return <TextCard text={item} />
		}

		if (item.kind === 'unified-table') {
			return (
				<Suspense fallback={<div className="flex min-h-[360px] flex-col p-1 md:min-h-[380px]" />}>
					<UnifiedTable
						config={item}
						onEdit={onEditItem ? (focusSection) => onEditItem(item, focusSection) : undefined}
						onOpenColumnModal={onEditItem ? () => onEditItem(item, 'columns') : undefined}
					/>
				</Suspense>
			)
		}

		if (item.kind === 'table') {
			if (item.tableType === 'dataset') {
				if (item.datasetType === 'cex') return <CexDataset />
				if (item.datasetType === 'revenue')
					return <RevenueDataset chains={item.chains} tableId={item.id} filters={item.filters} />
				if (item.datasetType === 'holders-revenue')
					return <HoldersRevenueDataset chains={item.chains} tableId={item.id} filters={item.filters} />
				if (item.datasetType === 'earnings')
					return <EarningsDataset chains={item.chains} tableId={item.id} filters={item.filters} />
				if (item.datasetType === 'fees') return <FeesDataset chains={item.chains} />
				if (item.datasetType === 'token-usage')
					return <TokenUsageDataset config={item} onConfigChange={(newConfig) => handleEditItem(item.id, newConfig)} />
				if (item.datasetType === 'yields')
					return (
						<div className="relative" style={{ isolation: 'isolate' }}>
							<YieldsDataset
								chains={item.chains}
								tableId={item.id}
								columnOrder={item.columnOrder}
								columnVisibility={item.columnVisibility}
								filters={item.filters as any}
							/>
						</div>
					)
				if (item.datasetType === 'aggregators') return <AggregatorsDataset chains={item.chains} />
				if (item.datasetType === 'perps') return <PerpsDataset chains={item.chains} />
				if (item.datasetType === 'options') return <OptionsDataset chains={item.chains} />
				if (item.datasetType === 'dexs') return <DexsDataset chains={item.chains} />
				if (item.datasetType === 'bridge-aggregators') return <BridgeAggregatorsDataset chains={item.chains} />
				if (item.datasetType === 'trending-contracts')
					return (
						<TrendingContractsDataset
							chain={item.datasetChain}
							timeframe={item.datasetTimeframe}
							tableId={item.id}
							onChainChange={(newChain) => {
								handleEditItem(item.id, { ...item, datasetChain: newChain })
							}}
							onTimeframeChange={(newTimeframe) => {
								handleEditItem(item.id, { ...item, datasetTimeframe: newTimeframe })
							}}
						/>
					)
				if (item.datasetType === 'chains')
					return (
						<ChainsDataset
							category={item.datasetChain}
							tableId={item.id}
							columnOrder={item.columnOrder}
							columnVisibility={item.columnVisibility}
						/>
					)
				return <StablecoinsDataset chain={item.datasetChain || 'All'} />
			}

			const tableColSpan = (item.colSpan ?? 2) >= 2 ? 2 : 1
			return (
				<ProtocolsByChainTable
					tableId={item.id}
					chains={item.chains}
					colSpan={tableColSpan}
					filters={item.filters}
					columnOrder={item.columnOrder}
					columnVisibility={item.columnVisibility}
					customColumns={item.customColumns}
					activeViewId={item.activeViewId}
					activePresetId={item.activePresetId}
				/>
			)
		}

		return null
	}

	if (isReadOnly) {
		return (
			<div className="grid grid-flow-dense grid-cols-1 gap-2 lg:grid-cols-4">
				{chartsWithData.map((item) => {
					const spanOptions = item.kind === 'metric' ? METRIC_COL_SPANS : STORED_COL_SPANS
					const fallbackSpan: StoredColSpan = item.kind === 'metric' ? spanOptions[0] : 1
					const storedColSpan = normalizeStoredColSpan(item.colSpan, fallbackSpan)
					const effectiveColSpan = getEffectiveColSpan(storedColSpan)
					const largeColClass = COL_SPAN_CLASS_MAP[effectiveColSpan]

					return (
						<div
							key={`${item.id}-${item.colSpan}${
								item.kind === 'multi' ? `-${item.items?.map((i) => i.id).join('-')}` : ''
							}`}
							className={`col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) ${largeColClass}`}
						>
							{renderItemContent(item)}
						</div>
					)
				})}
			</div>
		)
	}

	return (
		<>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={chartsWithData.map((c) => c.id)} strategy={rectSortingStrategy}>
					<div className="grid grid-flow-dense grid-cols-1 gap-2 lg:grid-cols-4">
						{chartsWithData.map((item) => {
							const spanOptions = item.kind === 'metric' ? METRIC_COL_SPANS : STORED_COL_SPANS
							const fallbackSpan: StoredColSpan = item.kind === 'metric' ? spanOptions[0] : 1
							const storedColSpan = normalizeStoredColSpan(item.colSpan, fallbackSpan)
							const effectiveColSpan = getEffectiveColSpan(storedColSpan)
							const shrinkTarget = getPreviousStoredColSpan(storedColSpan, spanOptions)
							const expandTarget = getNextStoredColSpan(storedColSpan, spanOptions)
							const disableShrink = shrinkTarget === storedColSpan
							const disableExpand = expandTarget === storedColSpan
							const largeColClass = COL_SPAN_CLASS_MAP[effectiveColSpan]

							return (
								<div
									key={`${item.id}-${item.colSpan}${
										item.kind === 'multi' ? `-${item.items?.map((i) => i.id).join('-')}` : ''
									}`}
									className={`col-span-1 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${largeColClass}`}
								>
									<SortableItem id={item.id} isTable={item.kind === 'table'} data-col={item.colSpan}>
										<div className="flex flex-wrap items-center justify-end border-b border-(--cards-border)">
											<>
												<Tooltip
													content="Shrink width"
													render={
														<button
															onClick={() => handleColSpanChange(item.id, shrinkTarget)}
															disabled={disableShrink}
														/>
													}
													className="hover:pro-btn-blue px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
												>
													<Icon name="minus" height={14} width={14} />
													<span className="sr-only">Shrink width</span>
												</Tooltip>
												<Tooltip
													content="Expand width"
													render={
														<button
															onClick={() => handleColSpanChange(item.id, expandTarget)}
															disabled={disableExpand}
														/>
													}
													className="hover:pro-btn-blue px-3 py-2 disabled:cursor-not-allowed disabled:opacity-50"
												>
													<Icon name="plus" height={14} width={14} />
													<span className="sr-only">Expand width</span>
												</Tooltip>
											</>
											{onEditItem && (
												<Tooltip
													content="Edit item"
													render={<button onClick={() => onEditItem(item)} />}
													className="hover:pro-btn-blue px-3 py-2"
												>
													<Icon name="pencil" height={14} width={14} />
													<span className="sr-only">Edit item</span>
												</Tooltip>
											)}
											<Tooltip
												content="Remove item"
												render={<button onClick={() => handleDeleteClick(item.id)} />}
												className="rounded-tr-md px-3 py-2 hover:bg-red-500/10 hover:text-(--error)"
											>
												<Icon name="x" height={14} width={14} />
												<span className="sr-only">Remove item</span>
											</Tooltip>
										</div>
										<div>{renderItemContent(item)}</div>
									</SortableItem>
								</div>
							)
						})}
						{currentRatingSession && !isReadOnly && (
							<div className="animate-ai-glow col-span-full flex flex-col items-center justify-center gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-4">
								<Rating
									sessionId={currentRatingSession.sessionId}
									mode={currentRatingSession.mode}
									variant="inline"
									prompt={currentRatingSession.prompt}
									onRate={submitRating}
									onSkip={skipRating}
								/>
							</div>
						)}
						<button
							onClick={onAddChartClick}
							className="hover:bg-pro-blue-300/5 dark:hover:bg-pro-blue-300/10 relative isolate flex min-h-[340px] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-(--cards-border) bg-(--cards-bg) p-2.5 text-(--link-text)"
						>
							<svg
								width="40"
								height="40"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
							<span className="text-lg font-medium">Add Item</span>
						</button>
					</div>
				</SortableContext>
			</DndContext>

			<ConfirmationModal
				isOpen={!!deleteConfirmItem}
				onClose={handleCancelDelete}
				onConfirm={handleConfirmDelete}
				title="Remove Item"
				message="Are you sure you want to remove this item from your dashboard? This action cannot be undone."
				confirmText="Remove"
				cancelText="Cancel"
			/>
		</>
	)
})
