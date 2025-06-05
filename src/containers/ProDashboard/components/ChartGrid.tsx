import dynamic from 'next/dynamic'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '~/containers/ProtocolOverview/ProtocolPro'
import { ChartCard } from './ChartCard'
import { DashboardItemConfig, Chain, Protocol } from '../types'
import { ProtocolsByChainTable } from '~/components/Table/Defi/Protocols/ProTable'
import { Icon } from '~/components/Icon'

const MultiChartCard = dynamic(() => import('./MultiChartCard'), {
	ssr: false
})

interface ChartGridProps {
	charts: DashboardItemConfig[]
	onChartsReordered: (newCharts: DashboardItemConfig[]) => void
	onRemoveChart: (id: string) => void
	getChainInfo: (chainName: string) => Chain | undefined
	getProtocolInfo: (protocolId: string) => Protocol | undefined
	onGroupingChange: (chartId: string, newGrouping: 'day' | 'week' | 'month') => void
	onAddChartClick: () => void
}

export function ChartGrid({
	charts,
	onChartsReordered,
	onRemoveChart,
	getChainInfo,
	getProtocolInfo,
	onGroupingChange,
	onAddChartClick
}: ChartGridProps) {
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
			const oldIndex = charts.findIndex((item) => item.id === active.id)
			const newIndex = charts.findIndex((item) => item.id === over.id)
			const newCharts = arrayMove(charts, oldIndex, newIndex)
			onChartsReordered(newCharts)
		}
	}

	return (
		<div className="mt-4">
			<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
				<SortableContext items={charts.map((c) => c.id)} strategy={rectSortingStrategy}>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
						{charts.map((item) => (
							<SortableItem key={item.id} id={item.id} isTable={item.kind === 'table'}>
								{item.kind === 'chart' ? (
									<ChartCard
										chart={item}
										onRemove={onRemoveChart}
										getChainInfo={getChainInfo}
										getProtocolInfo={getProtocolInfo}
										onGroupingChange={onGroupingChange}
									/>
								) : item.kind === 'multi' ? (
									<MultiChartCard
										multi={item}
										onRemove={onRemoveChart}
										getChainInfo={getChainInfo}
										getProtocolInfo={getProtocolInfo}
										onGroupingChange={onGroupingChange}
									/>
								) : (
									<div className="relative h-full">
										<div className="absolute top-2 right-2 z-10">
											<button
												className="p-1 rounded-md hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text1)] bg-[var(--bg7)]"
												onClick={() => onRemoveChart(item.id)}
												aria-label="Remove table"
											>
												<Icon name="x" height={16} width={16} />
											</button>
										</div>
										<ProtocolsByChainTable chain={item.chain} />
									</div>
								)}
							</SortableItem>
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
