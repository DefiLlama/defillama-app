import { preparePieChartData } from '~/components/ECharts/utils'
import { calculateTotalWithExtraToggles } from '~/utils/tvlOverlap'
import type { OracleBreakdownItem, OraclesByChainPageData } from './types'

interface OracleDominanceChart {
	type: 'line'
	name: string
	encode: { x: string; y: string }
	color: string
	stack: string
}

function indexExtraChartDataByTimestamp(extraBreakdownsByApiKey: Record<string, Array<OracleBreakdownItem>>) {
	const indexedByTimestamp = new Map<number, Record<string, Record<string, number>>>()

	for (const apiKey in extraBreakdownsByApiKey) {
		for (const dayData of extraBreakdownsByApiKey[apiKey]) {
			const timestamp = dayData.timestamp
			const valuesByOracle = indexedByTimestamp.get(timestamp) ?? {}

			for (const oracleName in dayData) {
				if (oracleName === 'timestamp') continue
				const value = dayData[oracleName]
				if (!Number.isFinite(value)) continue
				const currentValues = valuesByOracle[oracleName] ?? {}
				currentValues[apiKey] = value
				valuesByOracle[oracleName] = currentValues
			}

			indexedByTimestamp.set(timestamp, valuesByOracle)
		}
	}

	return indexedByTimestamp
}

function calculateTotalWithOracleExtras({
	tvl,
	extraTvl,
	extraTvlsEnabled
}: {
	tvl: number
	extraTvl: Record<string, number> | undefined
	extraTvlsEnabled: Record<string, boolean>
}) {
	if (!extraTvl) return tvl

	const values: Record<string, number> = { tvl }
	for (const extraKey in extraTvl) {
		values[extraKey] = extraTvl[extraKey]
	}

	return calculateTotalWithExtraToggles({ values, extraTvlsEnabled })
}

export function buildOraclesByChainTableAndPieData({
	tableData,
	extraTvlsEnabled,
	hasEnabledExtras
}: {
	tableData: OraclesByChainPageData['tableData']
	extraTvlsEnabled: Record<string, boolean>
	hasEnabledExtras: boolean
}) {
	if (!hasEnabledExtras) {
		const pieInput: Array<{ name: string; value: number }> = []
		for (const row of tableData) {
			pieInput.push({ name: row.name, value: row.tvl })
		}

		return {
			tableData,
			pieData: preparePieChartData({ data: pieInput, limit: 5 })
		}
	}

	const tableDataWithAdjustedTvl: OraclesByChainPageData['tableData'] = []
	for (const row of tableData) {
		tableDataWithAdjustedTvl.push({
			...row,
			tvl: calculateTotalWithOracleExtras({
				tvl: row.tvl,
				extraTvl: row.extraTvl,
				extraTvlsEnabled
			})
		})
	}
	tableDataWithAdjustedTvl.sort((a, b) => b.tvl - a.tvl)

	const pieInput: Array<{ name: string; value: number }> = []
	for (const row of tableDataWithAdjustedTvl) {
		pieInput.push({ name: row.name, value: row.tvl })
	}

	return {
		tableData: tableDataWithAdjustedTvl,
		pieData: preparePieChartData({ data: pieInput, limit: 5 })
	}
}

export function buildOraclesByChainDominanceData({
	chartData,
	oracles,
	oraclesColors,
	extraBreakdownsByApiKey,
	extraTvlsEnabled,
	shouldApplyExtraTvlFormatting
}: {
	chartData: OraclesByChainPageData['chartData']
	oracles: OraclesByChainPageData['oracles']
	oraclesColors: OraclesByChainPageData['oraclesColors']
	extraBreakdownsByApiKey: Record<string, Array<OracleBreakdownItem>>
	extraTvlsEnabled: Record<string, boolean>
	shouldApplyExtraTvlFormatting: boolean
}) {
	const extraValuesByTimestamp = shouldApplyExtraTvlFormatting
		? indexExtraChartDataByTimestamp(extraBreakdownsByApiKey)
		: null
	const dimensions = ['timestamp', ...oracles]
	const source: Array<Record<string, number>> = []

	for (const baseDayData of chartData) {
		const timestampInSeconds = baseDayData.timestamp
		if (!Number.isFinite(timestampInSeconds)) continue
		const extraValuesForTimestamp = extraValuesByTimestamp?.get(timestampInSeconds)

		const point: Record<string, number> = { timestamp: timestampInSeconds * 1e3 }
		let dayTotal = 0

		for (const oracleName of oracles) {
			const oracleTvs = shouldApplyExtraTvlFormatting
				? calculateTotalWithOracleExtras({
						tvl: baseDayData[oracleName] ?? 0,
						extraTvl: extraValuesForTimestamp?.[oracleName],
						extraTvlsEnabled
					})
				: (baseDayData[oracleName] ?? 0)
			point[oracleName] = oracleTvs
			dayTotal += oracleTvs
		}

		if (dayTotal === 0) continue

		for (const oracleName of oracles) {
			point[oracleName] = (point[oracleName] / dayTotal) * 100
		}
		source.push(point)
	}

	const dominanceCharts: Array<OracleDominanceChart> = []
	for (const name of oracles) {
		dominanceCharts.push({
			type: 'line',
			name,
			encode: { x: 'timestamp', y: name },
			color: oraclesColors[name] ?? '#ccc',
			stack: 'dominance'
		})
	}

	return {
		dominanceCharts,
		dominanceDataset: { source, dimensions }
	}
}
