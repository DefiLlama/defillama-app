import type * as echarts from 'echarts/core'
import { ChartCsvExportButton } from './ChartCsvExportButton'
import { ChartPngExportButton, type PngExportProfile } from './ChartPngExportButton'

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
	prepareCsvDirect?: () => { filename: string; rows: Array<Array<string | number | boolean>> }
	pngProfile?: PngExportProfile
	onCsvExport?: (info: { filename: string }) => void
	onPngExport?: (info: { kind: 'download' | 'copy'; filename: string }) => void
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
	showPng = true,
	prepareCsvDirect,
	pngProfile,
	onCsvExport,
	onPngExport
}: ChartExportButtonsProps) {
	return (
		<>
			{showCsv ? (
				<ChartCsvExportButton
					chartInstance={chartInstance}
					filename={filename}
					className={className}
					smol={smol}
					prepareCsvDirect={prepareCsvDirect}
					onExport={onCsvExport}
				/>
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
					pngProfile={pngProfile}
					onExport={onPngExport}
				/>
			) : null}
		</>
	)
}
