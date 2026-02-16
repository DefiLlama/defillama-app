import { useMemo } from 'react'

export interface IOracleTableRow {
	rank: number
	name: string
	protocolsSecured: number
	tvs: number
	chains: string[]
	chainsCount: number
}

interface IOracleDominanceChart {
	type: 'line'
	name: string
	encode: { x: string; y: string }
	color: string
	stack: string
}

interface IUseOraclesDataProps {
	chartData: Array<[number, Record<string, { tvl: number }>]>
	tokens: string[]
	tokensProtocols: Record<string, number>
	oraclesColors: Record<string, string>
}

interface IUseOraclesDataResult {
	tableData: Array<IOracleTableRow>
	pieChartData: Array<{ name: string; value: number }>
	dominanceCharts: Array<IOracleDominanceChart>
	dataset: { source: Array<Record<string, number>>; dimensions: Array<string> }
}

export function useOraclesData({
	chartData,
	tokens,
	tokensProtocols,
	oraclesColors
}: IUseOraclesDataProps): IUseOraclesDataResult {
	return useMemo(() => {
		if (chartData.length === 0) {
			return {
				tableData: [],
				pieChartData: [],
				dominanceCharts: [],
				dataset: { source: [], dimensions: [] }
			}
		}

		const latestValues = chartData[chartData.length - 1]?.[1] ?? {}
		const tableData: IOracleTableRow[] = []
		for (const [name, data] of Object.entries(latestValues)) {
			const tvl = data.tvl ?? 0
			tableData.push({
				rank: 0,
				name,
				protocolsSecured: tokensProtocols[name] ?? 0,
				tvs: tvl,
				chains: [],
				chainsCount: 0
			})
		}
		tableData.sort((a, b) => b.tvs - a.tvs)
		for (let i = 0; i < tableData.length; i++) {
			tableData[i].rank = i + 1
		}

		const pieChartData: Array<{ name: string; value: number }> = []
		for (const row of tableData) {
			pieChartData.push({
				name: row.name,
				value: row.tvs
			})
		}

		const dimensions = ['timestamp', ...tokens]
		const source: Array<Record<string, number>> = []

		for (const [timestampInSeconds, values] of chartData) {
			let dayTotal = 0
			for (const token of tokens) {
				dayTotal += values[token]?.tvl ?? 0
			}

			if (dayTotal === 0) continue

			const point: Record<string, number> = { timestamp: timestampInSeconds * 1e3 }
			for (const token of tokens) {
				const tvl = values[token]?.tvl ?? 0
				point[token] = (tvl / dayTotal) * 100
			}
			source.push(point)
		}

		const dominanceCharts = tokens.map((name) => ({
			type: 'line' as const,
			name,
			encode: { x: 'timestamp', y: name },
			color: oraclesColors[name] ?? '#ccc',
			stack: 'dominance'
		}))

		return {
			tableData,
			pieChartData,
			dominanceCharts,
			dataset: {
				source,
				dimensions
			}
		}
	}, [chartData, tokens, tokensProtocols, oraclesColors])
}
