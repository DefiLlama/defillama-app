import type { ICandlestickChartProps } from '~/components/ECharts/types'
import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'

export function adaptCandlestickData(
	config: ChartConfiguration,
	rawData: ChartDataSeries
): { data: ICandlestickChartProps['data']; indicators: ICandlestickChartProps['indicators'] } {
	let data: ICandlestickChartProps['data'] = []
	let indicators: ICandlestickChartProps['indicators'] = []

	if (!Array.isArray(rawData) || rawData.length === 0) {
		return { data, indicators }
	}

	const rows = rawData as Array<Record<string, unknown>>
	const sample = (rows[0] || {}) as Record<string, unknown>
	const keys = Object.keys(sample)
	const timeField = config.dataTransformation?.timeField
	const getTs = (row: Record<string, unknown>) => {
		const candidates = timeField ? [row[timeField], row.timestamp, row.date] : [row.timestamp, row.date]
		for (const raw of candidates) {
			if (raw == null) continue
			const t = Number(raw)
			if (Number.isFinite(t)) {
				return t < 1e12 ? t * 1000 : t
			}
			const d = new Date(raw as string).getTime()
			if (Number.isFinite(d)) return d
		}
		return NaN
	}
	const timestampedRows = rows
		.map((row) => ({ row, ts: getTs(row) }))
		.filter((entry): entry is { row: Record<string, unknown>; ts: number } => Number.isFinite(entry.ts))
	if (timestampedRows.length === 0) return { data, indicators }

	const metrics = config.dataTransformation?.metrics ?? []
	const ohlcFields = {
		open: metrics.find((m) => /open/i.test(m)) ?? 'open',
		high: metrics.find((m) => /high/i.test(m)) ?? 'high',
		low: metrics.find((m) => /low/i.test(m)) ?? 'low',
		close: metrics.find((m) => /close/i.test(m)) ?? 'close'
	}

	data = timestampedRows.map(({ row: r, ts }) => [
		ts,
		parseFloat(String(r[ohlcFields.open] ?? r.price ?? 0)),
		parseFloat(String(r[ohlcFields.close])),
		parseFloat(String(r[ohlcFields.low])),
		parseFloat(String(r[ohlcFields.high])),
		parseFloat(String(r.volume || 0))
	])

	const bbUpper = keys.find((k) => k.includes('_bb_upper'))
	const bbMiddle = keys.find((k) => k.includes('_bb_middle'))
	const bbLower = keys.find((k) => k.includes('_bb_lower'))
	if (bbUpper && bbMiddle && bbLower) {
		const hasValidBB = timestampedRows.some(({ row: r }) => {
			const u = parseFloat(String(r[bbUpper]))
			const m = parseFloat(String(r[bbMiddle]))
			const l = parseFloat(String(r[bbLower]))
			return (Number.isFinite(u) && u !== 0) || (Number.isFinite(m) && m !== 0) || (Number.isFinite(l) && l !== 0)
		})
		if (hasValidBB) {
			indicators.push({
				name: 'BBands',
				category: 'overlay',
				data: [],
				values: timestampedRows.map(({ row: r, ts }) => {
					const u = r[bbUpper] != null ? parseFloat(String(r[bbUpper])) : NaN
					const m = r[bbMiddle] != null ? parseFloat(String(r[bbMiddle])) : NaN
					const l = r[bbLower] != null ? parseFloat(String(r[bbLower])) : NaN
					return [
						ts,
						{
							upper: Number.isFinite(u) && u !== 0 ? u : null,
							middle: Number.isFinite(m) && m !== 0 ? m : null,
							lower: Number.isFinite(l) && l !== 0 ? l : null
						}
					]
				})
			})
		}
	}

	const maFields = keys.filter((k) => /^(sma|ema|dema|tema|wma|vwap)_?\d*$/i.test(k))
	for (const field of maFields) {
		indicators.push({
			name: field.toUpperCase(),
			category: 'overlay',
			data: timestampedRows.map(({ row: r, ts }) => {
				const v = parseFloat(String(r[field]))
				return [ts, Number.isFinite(v) ? v : null]
			})
		})
	}

	const rsiField = keys.find((k) => /^rsi(_\d+)?$/i.test(k))
	if (rsiField) {
		indicators.push({
			name: 'RSI',
			category: 'panel',
			data: timestampedRows.map(({ row: r, ts }) => {
				const v = parseFloat(String(r[rsiField]))
				return [ts, Number.isFinite(v) ? v : null]
			})
		})
	}

	const macdField = keys.find((k) => k === 'macd')
	const signalField = keys.find((k) => k === 'macd_signal')
	const histField = keys.find((k) => k === 'macd_histogram')
	if (macdField || signalField || histField) {
		const hasValidMACD = timestampedRows.some(({ row: r }) => {
			const m = parseFloat(String(r[macdField as string]))
			const s = parseFloat(String(r[signalField as string]))
			const h = parseFloat(String(r[histField as string]))
			return Number.isFinite(m) || Number.isFinite(s) || Number.isFinite(h)
		})
		if (hasValidMACD) {
			indicators.push({
				name: 'MACD',
				category: 'panel',
				data: [],
				values: timestampedRows.map(({ row: r, ts }) => {
					const mv = r[macdField as string] != null ? parseFloat(String(r[macdField as string])) : NaN
					const sv = r[signalField as string] != null ? parseFloat(String(r[signalField as string])) : NaN
					const hv = r[histField as string] != null ? parseFloat(String(r[histField as string])) : NaN
					return [
						ts,
						{
							macd: Number.isFinite(mv) ? mv : null,
							signal: Number.isFinite(sv) ? sv : null,
							histogram: Number.isFinite(hv) ? hv : null
						}
					]
				})
			})
		}
	}

	const stochK = keys.find((k) => k === 'stoch_k')
	const stochD = keys.find((k) => k === 'stoch_d')
	if (stochK || stochD) {
		const hasValidStoch = timestampedRows.some(({ row: r }) => {
			const k = parseFloat(String(r[stochK as string]))
			const d = parseFloat(String(r[stochD as string]))
			return Number.isFinite(k) || Number.isFinite(d)
		})
		if (hasValidStoch) {
			indicators.push({
				name: 'Stoch',
				category: 'panel',
				data: [],
				values: timestampedRows.map(({ row: r, ts }) => {
					const k = r[stochK as string] != null ? parseFloat(String(r[stochK as string])) : NaN
					const d = r[stochD as string] != null ? parseFloat(String(r[stochD as string])) : NaN
					return [ts, { k: Number.isFinite(k) ? k : null, d: Number.isFinite(d) ? d : null }]
				})
			})
		}
	}

	return { data, indicators }
}
