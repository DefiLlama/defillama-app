import dynamic from 'next/dynamic'
import { CHART_TYPES, MultiChartConfig, Chain, Protocol } from '../types'
import { useChartsData } from '../queries'
import { generateChartColor } from '../utils'
import { useProDashboard } from '../ProDashboardContext'
import { Icon } from '~/components/Icon'

const MultiSeriesChart = dynamic(() => import('~/components/ECharts/MultiSeriesChart'), {
	ssr: false
})

interface MultiChartCardProps {
	multi: MultiChartConfig
}

function groupData(data: [string, number][] | undefined, grouping: 'day' | 'week' | 'month'): [string, number][] {
	if (!data || !CHART_TYPES[grouping]?.groupable) return data || []

	if (grouping === 'week') {
		const grouped: { [key: string]: number } = {}
		data.forEach(([date, value]) => {
			const d = new Date(date)
			const weekStart = new Date(d.setDate(d.getDate() - d.getDay()))
			const weekKey = weekStart.toISOString().split('T')[0]
			grouped[weekKey] = (grouped[weekKey] || 0) + value
		})
		return Object.entries(grouped).map(([date, value]) => [date, value])
	} else if (grouping === 'month') {
		const grouped: { [key: string]: number } = {}
		data.forEach(([date, value]) => {
			const monthKey = date.substring(0, 7) + '-01' // YYYY-MM-01
			grouped[monthKey] = (grouped[monthKey] || 0) + value
		})
		return Object.entries(grouped).map(([date, value]) => [date, value])
	}

	return data
}

export default function MultiChartCard({ multi }: MultiChartCardProps) {
	const { getProtocolInfo, handleGroupingChange, timePeriod } = useProDashboard()
	const queries = useChartsData(multi.items, timePeriod)

	const series = multi.items.map((cfg, i) => {
		const q = queries[i]
		const rawData = q?.data as [string, number][] | undefined
		const processedData = CHART_TYPES[cfg.type]?.groupable ? groupData(rawData, multi.grouping || 'day') : rawData
		const meta = CHART_TYPES[cfg.type]

		const name = cfg.protocol ? getProtocolInfo(cfg.protocol)?.name || cfg.protocol : cfg.chain

		const data: [number, number][] = (processedData || []).map(([timestamp, value]) => [
			Math.floor(new Date(timestamp).getTime()),
			value
		])

		return {
			name: `${name} ${meta?.title || cfg.type}`,
			type: (meta?.chartType === 'bar' ? 'bar' : 'line') as 'bar' | 'line',
			data,
			color: generateChartColor(i, `${name}_${cfg.type}`, meta?.color || '#8884d8')
		}
	})

	const hasError = queries.some((q) => q.isError)
	const isDataLoading = queries.some((q) => q.isLoading)


	return (
		<div className="p-4 h-full min-h-[340px] flex flex-col">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-medium text-[var(--text1)]">
						{multi.name || `Multi-Chart (${multi.items.length})`}
					</h3>
				</div>
			</div>

			<div style={{ height: '300px', flexGrow: 1 }}>
				{hasError ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<Icon name="alert-triangle" height={24} width={24} className="mx-auto mb-2 text-red-500" />
							<p className="text-sm text-[var(--text3)]">Failed to load chart data</p>
						</div>
					</div>
				) : isDataLoading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary1)] mx-auto mb-2"></div>
							<p className="text-sm text-[var(--text3)]">Loading charts...</p>
						</div>
					</div>
				) : (
					<MultiSeriesChart series={series} valueSymbol="$" hideDataZoom={true} />
				)}
			</div>
		</div>
	)
}