import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Icon } from '~/components/Icon'
import { ChartRouter } from './chart'
import { ChartExportButton } from './chart/ChartExportButton'
import { ChartToolbar } from './chart/ChartToolbar'
import { defaultChartConfig, migrateChartConfig, type ChartConfig } from './chartConfig'
import { classifyColumns, type ClassifiedColumn } from './columnKind'
import type { QueryResult } from './exportResults'

interface ResultsChartProps {
	result: QueryResult
	chartConfig: ChartConfig | undefined
	onChartConfigChange: (next: ChartConfig | null) => void
}

export function ResultsChart({ result, chartConfig, onChartConfigChange }: ResultsChartProps) {
	const chartInstanceRef = useRef<any>(null)
	const handleChartReady = useCallback((instance: any) => {
		chartInstanceRef.current = instance
	}, [])
	const getChartInstance = useCallback(() => chartInstanceRef.current, [])
	const classified = useMemo(() => classifyColumns(result), [result])
	const resultKey = useMemo(() => classified.map((c) => `${c.name}:${c.fine}`).join('|'), [classified])

	const resolvedConfig = useMemo<ChartConfig>(() => {
		if (!chartConfig) return defaultChartConfig(classified)
		return migrateChartConfig(chartConfig, classified)
	}, [chartConfig, classified])

	const migrationCtxRef = useRef({ chartConfig, classified, onChartConfigChange })
	migrationCtxRef.current = { chartConfig, classified, onChartConfigChange }
	useEffect(() => {
		const ctx = migrationCtxRef.current
		if (!ctx.chartConfig) {
			ctx.onChartConfigChange(defaultChartConfig(ctx.classified))
			return
		}
		const migrated = migrateChartConfig(ctx.chartConfig, ctx.classified)
		if (migrated !== ctx.chartConfig) ctx.onChartConfigChange(migrated)
	}, [resultKey])

	const hasNumeric = classified.some((c) => c.coarse === 'number')
	if (!hasNumeric) {
		return (
			<EmptyState
				message="No numeric columns detected in this result — nothing to chart."
				hint="Tip: wrap aggregates in CAST(... AS DOUBLE) or SUM(...) to make them chartable."
			/>
		)
	}

	const patch = (next: Partial<ChartConfig>) => onChartConfigChange({ ...resolvedConfig, ...next })

	return (
		<div className="flex flex-col gap-3">
			<ChartToolbar config={resolvedConfig} classified={classified} onChange={patch} />

			<div className="flex flex-col gap-2 rounded-md border border-(--divider) bg-(--cards-bg) p-2">
				<div className="flex items-center justify-end gap-1.5">
					<ChartExportButton
						chartInstance={getChartInstance}
						chartType={resolvedConfig.chartType}
						filename="sql-chart"
					/>
				</div>
				<ChartRouter
					config={resolvedConfig}
					result={result}
					classified={classified as ClassifiedColumn[]}
					onReady={handleChartReady}
				/>
			</div>
		</div>
	)
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
	return (
		<div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-(--divider) bg-(--bg-primary)/40 px-6 py-10 text-center">
			<Icon name="bar-chart-2" className="h-5 w-5 text-(--text-tertiary)" />
			<p className="text-sm text-(--text-secondary)">{message}</p>
			{hint ? <p className="text-xs text-(--text-tertiary)">{hint}</p> : null}
		</div>
	)
}
