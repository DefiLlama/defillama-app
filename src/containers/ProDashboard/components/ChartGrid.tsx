import { lazy, Suspense, useEffect, useState } from 'react'
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, rectSortingStrategy, SortableContext } from '@dnd-kit/sortable'
import { Icon } from '~/components/Icon'
import { Tooltip } from '~/components/Tooltip'
import { SortableItem } from '~/containers/ProtocolOverview/ProtocolPro'
import { useProDashboard } from '../ProDashboardAPIContext'
import { DashboardItemConfig } from '../types'
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

const ChartCard = lazy(() => import('./ChartCard').then((mod) => ({ default: mod.ChartCard })))
const MultiChartCard = lazy(() => import('./MultiChartCard'))
const ChartBuilderCard = lazy(() => import('./ChartBuilderCard').then((mod) => ({ default: mod.ChartBuilderCard })))

interface ChartGridProps {
	onAddChartClick: () => void
	onEditItem?: (item: DashboardItemConfig) => void
}

export function ChartGrid({ onAddChartClick, onEditItem }: ChartGridProps) {
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
				<Suspense fallback={<div className="fflex min-h-[402px] flex-col p-1 md:min-h-[418px]" />}>
					<MultiChartCard key={`${item.id}-${item.items?.map((i) => i.id).join('-')}`} multi={item} />
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

		if (item.kind === 'text') {
			return <TextCard text={item} />
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

			return (
				<ProtocolsByChainTable
					tableId={item.id}
					chains={item.chains}
					colSpan={item.colSpan}
					filters={item.filters}
					columnOrder={item.columnOrder}
					columnVisibility={item.columnVisibility}
					customColumns={item.customColumns}
					activeViewId={item.activeViewId}
				/>
			)
		}

		return null
	}

	if (isReadOnly) {
		return (
			<div className="grid grid-flow-dense grid-cols-1 gap-2 lg:grid-cols-2">
				{chartsWithData.map((item) => (
					<div
						key={`${item.id}-${item.colSpan}${item.kind === 'multi' ? `-${item.items?.map((i) => i.id).join('-')}` : ''}`}
						className={`col-span-1 rounded-md border border-(--cards-border) bg-(--cards-bg) ${item.colSpan === 2 ? 'lg:col-span-2' : ''}`}
					>
						{renderItemContent(item)}
					</div>
				))}
			</div>
		)
	}

	return (
		<>
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={chartsWithData.map((c) => c.id)} strategy={rectSortingStrategy}>
					<div className="grid grid-flow-dense grid-cols-1 gap-2 lg:grid-cols-2">
						{chartsWithData.map((item) => (
							<div
								key={`${item.id}-${item.colSpan}${item.kind === 'multi' ? `-${item.items?.map((i) => i.id).join('-')}` : ''}`}
								className={`col-span-1 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) ${item.colSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1'}`}
							>
								<SortableItem id={item.id} isTable={item.kind === 'table'} data-col={item.colSpan}>
									<div className="flex flex-wrap items-center justify-end border-b border-(--cards-border)">
										<Tooltip
											content={item.colSpan === 2 ? 'Make smaller' : 'Make wider'}
											render={<button onClick={() => handleColSpanChange(item.id, item.colSpan === 2 ? 1 : 2)} />}
											className="hover:pro-btn-blue px-3 py-2"
										>
											{item.colSpan === 1 ? (
												<Icon name="chevrons-up" height={14} width={14} style={{ transform: 'rotate(45deg)' }} />
											) : (
												<Icon name="chevrons-up" height={14} width={14} style={{ transform: 'rotate(-135deg)' }} />
											)}
										</Tooltip>
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
						))}
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
}
