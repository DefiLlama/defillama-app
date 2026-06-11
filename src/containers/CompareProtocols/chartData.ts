import { ensureChronologicalRows } from '~/components/ECharts/utils'
import { getNDistinctColors } from '~/utils'
import type { RawProtocolResponse } from './api.types'

export function buildCompareProtocolsChartData({
	protocolResponses,
	extraTvlEnabled
}: {
	protocolResponses: RawProtocolResponse[]
	extraTvlEnabled: Record<string, boolean>
}) {
	const chartsByProtocol = new Map<string, Map<number, number>>()
	const seriesNames: string[] = []
	let totalProtocols = 0

	for (const protocolData of protocolResponses) {
		const protocolName = protocolData.name
		let protocolChart = chartsByProtocol.get(protocolName)
		if (!protocolChart) {
			protocolChart = new Map<number, number>()
			chartsByProtocol.set(protocolName, protocolChart)
			seriesNames.push(protocolName)
		}

		for (const chain in protocolData.chainTvls ?? {}) {
			if (chain.includes('-') || chain === 'offers') continue
			if (chain in extraTvlEnabled && !extraTvlEnabled[chain]) continue

			const chainTvl = protocolData.chainTvls?.[chain]?.tvl
			// Protocol detail payloads are raw API responses; malformed chain sections are skipped like the legacy page.
			if (!Array.isArray(chainTvl)) continue

			for (const { date, totalLiquidityUSD } of chainTvl) {
				protocolChart.set(date, (protocolChart.get(date) ?? 0) + totalLiquidityUSD)
			}
		}
		totalProtocols++
	}

	const distinctColors = getNDistinctColors(totalProtocols)
	const rowMap = new Map<number, Record<string, number>>()
	for (const protocolName of seriesNames) {
		const protocolChart = chartsByProtocol.get(protocolName)
		if (!protocolChart) continue

		for (const [date, value] of protocolChart) {
			const timestamp = date * 1e3
			const row = rowMap.get(timestamp) ?? { timestamp }
			row[protocolName] = value
			rowMap.set(timestamp, row)
		}
	}

	const source = ensureChronologicalRows(Array.from(rowMap.values()))
	const charts: Array<{
		type: 'line'
		name: string
		encode: { x: string; y: string }
		stack: string
		color: string
	}> = []
	for (let index = 0; index < seriesNames.length; index++) {
		const protocolName = seriesNames[index]
		charts.push({
			type: 'line',
			name: protocolName,
			encode: { x: 'timestamp', y: protocolName },
			stack: protocolName,
			color: distinctColors[index]
		})
	}

	return {
		dataset: { source, dimensions: ['timestamp', ...seriesNames] },
		charts
	}
}
