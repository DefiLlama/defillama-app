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

	const metrics = config.dataTransformation?.metrics ?? []
	const ohlcFields = {
		open: metrics.find((m) => /open/i.test(m)) ?? 'open',
		high: metrics.find((m) => /high/i.test(m)) ?? 'high',
		low: metrics.find((m) => /low/i.test(m)) ?? 'low',
		close: metrics.find((m) => /close/i.test(m)) ?? 'close'
	}

	data = []
	for (const r of rows) {
		data.push([
			getTs(r),
			parseFloat(String(r[ohlcFields.open] ?? r.price ?? 0)),
			parseFloat(String(r[ohlcFields.close])),
			parseFloat(String(r[ohlcFields.low])),
			parseFloat(String(r[ohlcFields.high])),
			parseFloat(String(r.volume || 0))
		])
	}

	const bbUpper = keys.find((k) => k.includes('_bb_upper'))
	const bbMiddle = keys.find((k) => k.includes('_bb_middle'))
	const bbLower = keys.find((k) => k.includes('_bb_lower'))
	if (bbUpper && bbMiddle && bbLower) {
		let hasValidBB = false
		const values: NonNullable<ICandlestickChartProps['indicators']>[number]['values'] = []
		for (let index = 0; index < rows.length; index++) {
			const r = rows[index]
			const u = parseFloat(String(r[bbUpper]))
			const m = parseFloat(String(r[bbMiddle]))
			const l = parseFloat(String(r[bbLower]))
			hasValidBB ||=
				(Number.isFinite(u) && u !== 0) || (Number.isFinite(m) && m !== 0) || (Number.isFinite(l) && l !== 0)
			values.push([
				data[index][0],
				{
					upper: Number.isFinite(u) && u !== 0 ? u : null,
					middle: Number.isFinite(m) && m !== 0 ? m : null,
					lower: Number.isFinite(l) && l !== 0 ? l : null
				}
			])
		}
		if (hasValidBB) {
			indicators.push({
				name: 'BBands',
				category: 'overlay',
				data: [],
				values
			})
		}
	}

	const maFields = keys.filter((k) => /^(sma|ema|dema|tema|wma|vwap)_?\d*$/i.test(k))
	for (const field of maFields) {
		const indicatorData: NonNullable<ICandlestickChartProps['indicators']>[number]['data'] = []
		for (let index = 0; index < rows.length; index++) {
			const v = parseFloat(String(rows[index][field]))
			indicatorData.push([data[index][0], Number.isFinite(v) ? v : null])
		}
		indicators.push({
			name: field.toUpperCase(),
			category: 'overlay',
			data: indicatorData
		})
	}

	const rsiField = keys.find((k) => /^rsi(_\d+)?$/i.test(k))
	if (rsiField) {
		const rsiData: NonNullable<ICandlestickChartProps['indicators']>[number]['data'] = []
		for (let index = 0; index < rows.length; index++) {
			const v = parseFloat(String(rows[index][rsiField]))
			rsiData.push([data[index][0], Number.isFinite(v) ? v : null])
		}
		indicators.push({
			name: 'RSI',
			category: 'panel',
			data: rsiData
		})
	}

	const macdField = keys.find((k) => k === 'macd')
	const signalField = keys.find((k) => k === 'macd_signal')
	const histField = keys.find((k) => k === 'macd_histogram')
	if (macdField || signalField || histField) {
		let hasValidMACD = false
		const values: NonNullable<ICandlestickChartProps['indicators']>[number]['values'] = []
		for (let index = 0; index < rows.length; index++) {
			const r = rows[index]
			const m = parseFloat(String(r[macdField as string]))
			const s = parseFloat(String(r[signalField as string]))
			const h = parseFloat(String(r[histField as string]))
			hasValidMACD ||= Number.isFinite(m) || Number.isFinite(s) || Number.isFinite(h)
			values.push([
				data[index][0],
				{
					macd: Number.isFinite(m) ? m : null,
					signal: Number.isFinite(s) ? s : null,
					histogram: Number.isFinite(h) ? h : null
				}
			])
		}
		if (hasValidMACD) {
			indicators.push({
				name: 'MACD',
				category: 'panel',
				data: [],
				values
			})
		}
	}

	const stochK = keys.find((k) => k === 'stoch_k')
	const stochD = keys.find((k) => k === 'stoch_d')
	if (stochK || stochD) {
		let hasValidStoch = false
		const values: NonNullable<ICandlestickChartProps['indicators']>[number]['values'] = []
		for (let index = 0; index < rows.length; index++) {
			const r = rows[index]
			const k = parseFloat(String(r[stochK as string]))
			const d = parseFloat(String(r[stochD as string]))
			hasValidStoch ||= Number.isFinite(k) || Number.isFinite(d)
			values.push([data[index][0], { k: Number.isFinite(k) ? k : null, d: Number.isFinite(d) ? d : null }])
		}
		if (hasValidStoch) {
			indicators.push({
				name: 'Stoch',
				category: 'panel',
				data: [],
				values
			})
		}
	}

	return { data, indicators }
}
