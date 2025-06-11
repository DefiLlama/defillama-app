import dynamic from 'next/dynamic'
import { CHART_TYPES, MultiChartConfig } from '../types'
import { generateChartColor } from '../utils'
import { useProDashboard } from '../ProDashboardAPIContext'
import { Icon } from '~/components/Icon'
import { memo } from 'react'

const MultiSeriesChart = dynamic(() => import('~/components/ECharts/MultiSeriesChart'), {
	ssr: false
})

interface MultiChartCardProps {
	multi: MultiChartConfig
}

const MultiChartCard = memo(function MultiChartCard({ multi }: MultiChartCardProps) {
	const { getProtocolInfo } = useProDashboard()

	// Filter valid items and create series data
	const validItems = multi.items.filter((cfg) => {
		// Skip if loading, has error, or invalid data
		if (cfg.isLoading || cfg.hasError) return false
		
		// Check if data is a valid array
		const rawData = cfg.data as [string, number][] | undefined | null
		return Array.isArray(rawData) && rawData.length > 0
	})

	const failedItems = multi.items.filter((cfg) => {
		return cfg.hasError || !Array.isArray(cfg.data) || (Array.isArray(cfg.data) && cfg.data.length === 0)
	})

	const loadingItems = multi.items.filter((cfg) => cfg.isLoading)

	const series = validItems.map((cfg, i) => {
		const rawData = cfg.data as [string, number][]
		const meta = CHART_TYPES[cfg.type]
		const name = cfg.protocol ? getProtocolInfo(cfg.protocol)?.name || cfg.protocol : cfg.chain

		const data: [number, number][] = rawData.map(([timestamp, value]) => [
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

	const hasAnyData = validItems.length > 0
	const isAllLoading = loadingItems.length === multi.items.length
	const hasPartialFailures = failedItems.length > 0 && validItems.length > 0


	return (
		<div className="p-4 h-full min-h-[340px] flex flex-col">
			<div className="flex items-center justify-between mb-2 pr-28">
				<div className="flex items-center gap-2">
					<h3 className="text-sm font-medium text-[var(--text1)]">
						{multi.name || `Multi-Chart (${multi.items.length})`}
					</h3>
					{hasPartialFailures && (
						<div className="flex items-center gap-1 text-xs text-yellow-500">
							<Icon name="alert-triangle" height={12} width={12} />
							<span>Partial data</span>
						</div>
					)}
				</div>
			</div>

			{/* Status info for failures */}
			{(failedItems.length > 0 || loadingItems.length > 0) && (
				<div className="mb-2 text-xs text-[var(--text3)]">
					{loadingItems.length > 0 && (
						<div>Loading: {loadingItems.length} chart{loadingItems.length > 1 ? 's' : ''}</div>
					)}
					{failedItems.length > 0 && (
						<div>Failed: {failedItems.length} chart{failedItems.length > 1 ? 's' : ''}</div>
					)}
					{hasAnyData && (
						<div>Showing: {validItems.length} chart{validItems.length > 1 ? 's' : ''}</div>
					)}
				</div>
			)}

			<div style={{ height: '300px', flexGrow: 1 }}>
				{!hasAnyData && isAllLoading ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary1)] mx-auto mb-2"></div>
							<p className="text-sm text-[var(--text3)]">Loading charts...</p>
						</div>
					</div>
				) : !hasAnyData ? (
					<div className="flex items-center justify-center h-full">
						<div className="text-center">
							<Icon name="alert-triangle" height={24} width={24} className="mx-auto mb-2 text-red-500" />
							<p className="text-sm text-[var(--text3)]">Failed to load chart data</p>
							<p className="text-xs text-[var(--text3)] mt-1">
								{failedItems.length} of {multi.items.length} charts failed
							</p>
						</div>
					</div>
				) : (
					<MultiSeriesChart series={series} valueSymbol="$" hideDataZoom={true} />
				)}
			</div>
		</div>
	)
})

export default MultiChartCard