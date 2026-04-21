import { lazy, Suspense, useMemo } from 'react'
import { LoadingSpinner } from '~/components/Loaders'
import type { ChartConfig } from '../../chartConfig'
import type { ClassifiedColumn } from '../../columnKind'
import type { QueryResult } from '../../exportResults'

interface ICandlestickChartShim {
	data: Array<[number, number, number, number, number, number]>
}

const CandlestickChart = lazy(
	() => import('~/components/ECharts/CandlestickChart')
) as unknown as React.FC<ICandlestickChartShim>

interface CandlestickChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function CandlestickChartAdapter({ config, result, classified }: CandlestickChartAdapterProps) {
	const mapping = config.candlestick
	const data = useMemo(() => {
		if (!mapping) return []
		const out: Array<[number, number, number, number, number, number]> = []
		for (const row of result.rows) {
			const ts = toSeconds(row[mapping.ts])
			const open = toNumber(row[mapping.open])
			const close = toNumber(row[mapping.close])
			const low = toNumber(row[mapping.low])
			const high = toNumber(row[mapping.high])
			if (ts == null || open == null || close == null || low == null || high == null) continue
			const volume = mapping.volume ? (toNumber(row[mapping.volume]) ?? 0) : 0
			out.push([ts * 1000, open, close, low, high, volume])
		}
		return out
	}, [result, mapping])

	if (!mapping)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				Candlestick needs timestamp + open/close/high/low columns. Map them in Advanced settings.
			</div>
		)
	if (data.length === 0)
		return (
			<div className="flex h-[220px] items-center justify-center rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
				No candles could be built from the current column mapping.
			</div>
		)

	void classified
	void config
	return (
		<Suspense
			fallback={
				<div className="flex h-[420px] items-center justify-center">
					<LoadingSpinner size={18} />
				</div>
			}
		>
			<CandlestickChart data={data} />
		</Suspense>
	)
}

function toNumber(v: unknown): number | null {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null
	if (typeof v === 'bigint') return Number(v)
	if (typeof v === 'string') {
		const n = Number(v.trim())
		return Number.isFinite(n) ? n : null
	}
	return null
}

function toSeconds(v: unknown): number | null {
	if (v instanceof Date) {
		const t = v.getTime()
		return Number.isFinite(t) ? t / 1000 : null
	}
	if (typeof v === 'bigint') {
		const n = Number(v)
		if (!Number.isFinite(n)) return null
		return Math.abs(n) > 1e12 ? n / 1000 : n
	}
	if (typeof v === 'number') {
		if (!Number.isFinite(v)) return null
		return Math.abs(v) > 1e12 ? v / 1000 : v
	}
	if (typeof v === 'string') {
		const t = Date.parse(v)
		return Number.isFinite(t) ? t / 1000 : null
	}
	return null
}
