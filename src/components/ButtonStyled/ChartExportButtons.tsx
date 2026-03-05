import type * as echarts from 'echarts/core'
import { ChartCsvExportButton } from './ChartCsvExportButton'
import { ChartPngExportButton } from './ChartPngExportButton'

interface ChartExportButtonsProps {
	chartInstance: () => echarts.ECharts | null
	filename?: string
	title?: string
	iconUrl?: string
	expandLegend?: boolean
	className?: string
	smol?: boolean
	showCsv?: boolean
	showPng?: boolean
}

export function ChartExportButtons({
	chartInstance,
	filename,
	title,
	iconUrl,
	expandLegend,
	className,
	smol,
	showCsv = true,
	showPng = true
}: ChartExportButtonsProps) {
	return (
		<>
			{showCsv ? (
				<ChartCsvExportButton chartInstance={chartInstance} filename={filename} className={className} smol={smol} />
			) : null}
			{showPng ? (
				<ChartPngExportButton
					chartInstance={chartInstance}
					filename={filename}
					title={title}
					iconUrl={iconUrl}
					expandLegend={expandLegend}
					className={className}
					smol={smol}
				/>
			) : null}
		</>
	)
}
