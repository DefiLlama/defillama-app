import dynamic from 'next/dynamic'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '~/containers/ProtocolOverview/ProtocolPro'
import { ChartCard } from './ChartCard'
import { TextCard } from './TextCard'
import { ProtocolsByChainTable } from './ProTable'
import {
	StablecoinsDataset,
	CexDataset,
	RevenueDataset,
	HoldersRevenueDataset,
	EarningsDataset,
	TokenUsageDataset,
	YieldsDataset,
	AggregatorsDataset,
	PerpsDataset,
	OptionsDataset,
	DexsDataset,
	BridgeAggregatorsDataset
} from './datasets'
import { Icon } from '~/components/Icon'
import { useProDashboard } from '../ProDashboardAPIContext'
import { DashboardItemConfig } from '../types'

const MultiChartCard = dynamic(() => import('./MultiChartCard'), {
	ssr: false
})

interface ChartGridProps {
	onAddChartClick: () => void
	onEditItem?: (item: DashboardItemConfig) => void
}

export function ChartGrid({ onAddChartClick, onEditItem }: ChartGridProps) {
	const { chartsWithData, handleChartsReordered, handleRemoveItem, handleColSpanChange, handleEditItem, isReadOnly } =
		useProDashboard()
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5
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

	const getColSpanClass = (colSpan?: 1 | 2) => {
		return colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'
	}

	const renderItemContent = (item: DashboardItemConfig) => {
		if (item.kind === 'chart') {
			return <ChartCard chart={item} />
		}

		if (item.kind === 'multi') {
			return <MultiChartCard multi={item} />
		}

		if (item.kind === 'text') {
			return <TextCard text={item} />
		}

		if (item.kind === 'table') {
			if (item.tableType === 'dataset') {
				if (item.datasetType === 'cex') return <CexDataset />
				if (item.datasetType === 'revenue') return <RevenueDataset chains={item.chains} />
				if (item.datasetType === 'holders-revenue') return <HoldersRevenueDataset chains={item.chains} />
				if (item.datasetType === 'earnings') return <EarningsDataset chains={item.chains} />
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
				/>
			)
		}

		return null
	}

	if (isReadOnly) {
		return (
			<div className="mt-2">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ gridAutoFlow: 'dense' }}>
					{chartsWithData.map((item) => (
						<div key={`${item.id}-${item.colSpan}`} className={`${getColSpanClass(item.colSpan)}`}>
							<div className={`pro-glass h-full relative ${item.kind === 'table' ? 'overflow-visible' : ''}`}>
								<div className={item.kind === 'table' ? 'pr-12' : ''}>{renderItemContent(item)}</div>
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="mt-2">
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={chartsWithData.map((c) => c.id)} strategy={rectSortingStrategy}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ gridAutoFlow: 'dense' }}>
						{chartsWithData.map((item) => (
							<div key={`${item.id}-${item.colSpan}`} className={`${getColSpanClass(item.colSpan)}`}>
								<SortableItem id={item.id} isTable={item.kind === 'table'} className="h-full">
									<div
										className={`pro-glass h-full relative ${item.kind === 'table' ? 'pt-6' : ''} ${
											item.kind === 'table' ? 'overflow-visible' : 'overflow-hidden'
										}`}
									>
										<div className="absolute top-1 right-1 z-20 flex gap-1">
											<button
												className="p-1.5 text-sm pro-hover-bg pro-text1 transition-colors pro-bg1 dark:bg-[#070e0f]"
												onClick={() => handleColSpanChange(item.id, item.colSpan === 2 ? 1 : 2)}
												aria-label={item.colSpan === 2 ? 'Make smaller' : 'Make wider'}
												title={item.colSpan === 2 ? 'Make smaller' : 'Make wider'}
											>
												{item.colSpan === 1 ? (
													<Icon name="chevrons-up" height={14} width={14} style={{ transform: 'rotate(45deg)' }} />
												) : (
													<Icon name="chevrons-up" height={14} width={14} style={{ transform: 'rotate(-135deg)' }} />
												)}
											</button>
											{onEditItem && (
												<button
													className="p-1.5 text-sm pro-hover-bg pro-text1 transition-colors pro-bg1 dark:bg-[#070e0f]"
													onClick={() => onEditItem(item)}
													aria-label="Edit item"
													title="Edit item"
												>
													<Icon name="pencil" height={14} width={14} />
												</button>
											)}
											<button
												className="p-1.5 text-sm pro-hover-bg pro-text1 transition-colors pro-bg1 dark:bg-[#070e0f]"
												onClick={() => handleRemoveItem(item.id)}
												aria-label="Remove item"
											>
												<Icon name="x" height={14} width={14} />
											</button>
										</div>
										<div>{renderItemContent(item)}</div>
									</div>
								</SortableItem>
							</div>
						))}
						<div
							onClick={onAddChartClick}
							className="flex flex-col items-center justify-center border min-h-[340px] border-dashed pro-border cursor-pointer pro-bg7 hover:pro-bg2 transition-colors"
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
								className="text-(--primary1) mb-2"
							>
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
							<span className="text-(--primary1) font-medium text-lg">Add Item</span>
						</div>
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
}
