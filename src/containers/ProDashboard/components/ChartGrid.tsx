import dynamic from 'next/dynamic'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '~/containers/ProtocolOverview/ProtocolPro'
import { ChartCard } from './ChartCard'
import { TextCard } from './TextCard'
import { DashboardItemConfig, Chain, Protocol } from '../types'
import { ProtocolsByChainTable } from './ProTable'
import { Icon } from '~/components/Icon'
import { useProDashboard } from '../ProDashboardAPIContext'

const MultiChartCard = dynamic(() => import('./MultiChartCard'), {
	ssr: false
})

interface ChartGridProps {
	onAddChartClick: () => void
}

export function ChartGrid({ onAddChartClick }: ChartGridProps) {
	const { chartsWithData, handleChartsReordered, handleRemoveItem, handleColSpanChange, isReadOnly } = useProDashboard()
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 5
			}
		}),
		useSensor(KeyboardSensor)
	)

	const handleDragEnd = (event) => {
		const { active, over } = event

		if (active.id !== over.id) {
			const oldIndex = chartsWithData.findIndex((item) => item.id === active.id)
			const newIndex = chartsWithData.findIndex((item) => item.id === over.id)
			const newCharts = arrayMove(chartsWithData, oldIndex, newIndex)
			handleChartsReordered(newCharts)
		}
	}

	const getColSpanClass = (colSpan?: 1 | 2) => {
		return colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'
	}

	if (isReadOnly) {
		return (
			<div className="mt-2">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-2" style={{ gridAutoFlow: 'dense' }}>
					{chartsWithData.map((item) => (
						<div key={item.id} className={`${getColSpanClass(item.colSpan)}`}>
							<div className="bg-[var(--bg7)] bg-opacity-30 backdrop-filter backdrop-blur-xl border border-white/30 h-full relative">
								<div className={item.kind === 'table' ? 'pr-12' : ''}>
									{item.kind === 'chart' ? (
										<ChartCard key={`${item.id}-${item.colSpan}`} chart={item} />
									) : item.kind === 'multi' ? (
										<MultiChartCard key={`${item.id}-${item.colSpan}`} multi={item} />
									) : item.kind === 'text' ? (
										<TextCard key={`${item.id}-${item.colSpan}`} text={item} />
									) : (
										<ProtocolsByChainTable
											key={`${item.id}-${item.colSpan}`}
											chain={item.chain}
											colSpan={item.colSpan}
										/>
									)}
								</div>
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
							<div key={item.id} className={`${getColSpanClass(item.colSpan)}`}>
								<SortableItem id={item.id} isTable={item.kind === 'table'} className="h-full">
									<div className="bg-[var(--bg7)] bg-opacity-30 backdrop-filter backdrop-blur-xl border border-white/30 h-full relative">
										<div className="absolute top-1 right-1 z-20 flex gap-1">
											<button
												className="p-1.5 text-sm   hover:bg-[var(--bg3)] text-[var(--text1)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
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
											<button
												className="p-1.5 text-sm   hover:bg-[var(--bg3)] text-[var(--text1)] transition-colors bg-[var(--bg1)] dark:bg-[#070e0f]"
												onClick={() => handleRemoveItem(item.id)}
												aria-label="Remove item"
											>
												<Icon name="x" height={14} width={14} />
											</button>
										</div>
										<div className={item.kind === 'table' ? 'pr-12' : ''}>
											{item.kind === 'chart' ? (
												<ChartCard key={`${item.id}-${item.colSpan}`} chart={item} />
											) : item.kind === 'multi' ? (
												<MultiChartCard key={`${item.id}-${item.colSpan}`} multi={item} />
											) : item.kind === 'text' ? (
												<TextCard key={`${item.id}-${item.colSpan}`} text={item} />
											) : (
												<ProtocolsByChainTable
													key={`${item.id}-${item.colSpan}`}
													chain={item.chain}
													colSpan={item.colSpan}
												/>
											)}
										</div>
									</div>
								</SortableItem>
							</div>
						))}
						<div
							onClick={onAddChartClick}
							className="flex flex-col items-center justify-center border min-h-[340px] border-dashed border-[var(--form-control-border)] cursor-pointer bg-[var(--bg7)] hover:bg-[var(--bg2)] transition-colors"
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
								className="text-[var(--primary1)] mb-2"
							>
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							</svg>
							<span className="text-[var(--primary1)] font-medium text-lg">Add Item</span>
						</div>
					</div>
				</SortableContext>
			</DndContext>
		</div>
	)
}
