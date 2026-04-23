import { ChartPngExportButton, type PngExportProfile } from '~/components/ButtonStyled/ChartPngExportButton'
import type { ChartType } from '../chartConfig'

function profileFor(chartType: ChartType): PngExportProfile {
	if (chartType === 'treemap') return 'treemap'
	if (chartType === 'hbar') return 'hbar'
	if (chartType === 'scatter' || chartType === 'bubble') return 'scatterWithImageSymbols'
	return 'default'
}

interface ChartExportButtonProps {
	chartInstance: () => any
	chartType: ChartType
	title?: string | null
	filename?: string
}

const BUTTON_CLASS =
	'inline-flex items-center gap-1 rounded-md border border-(--divider) bg-(--app-bg)/50 px-2 py-1 text-[11px] text-(--text-secondary) hover:bg-(--link-hover-bg) hover:text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50'

export function ChartExportButton({ chartInstance, chartType, title, filename }: ChartExportButtonProps) {
	return (
		<ChartPngExportButton
			chartInstance={chartInstance}
			pngProfile={profileFor(chartType)}
			title={title ?? undefined}
			filename={filename}
			className={BUTTON_CLASS}
			smol
		/>
	)
}
