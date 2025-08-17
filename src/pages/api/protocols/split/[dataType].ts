import { NextApiRequest, NextApiResponse } from 'next'
import { DIMENISIONS_OVERVIEW_API, PROTOCOLS_API } from '~/constants'

interface ChartSeries {
	name: string
	data: [number, number][]
	color?: string
}

const COLORS = [
	'#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
	'#d084d0', '#82d982', '#ffb347', '#67b7dc', '#a4de6c'
]

const METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	'tvl': { endpoint: 'tvl', metricName: 'tvl' },
	
	'fees': { endpoint: 'fees', metricName: 'fees' },
	'revenue': { endpoint: 'fees', dataType: 'dailyRevenue', metricName: 'revenue' },
	'volume': { endpoint: 'dexs', metricName: 'volume' },
	
	'perps': { endpoint: 'derivatives', metricName: 'perps volume' },
	'options-notional': { endpoint: 'options', dataType: 'dailyNotionalVolume', metricName: 'options notional' },
	'options-premium': { endpoint: 'options', dataType: 'dailyPremiumVolume', metricName: 'options premium' },
	
	'bridge-aggregators': { endpoint: 'bridge-aggregators', metricName: 'bridge volume' },
	'dex-aggregators': { endpoint: 'aggregators', metricName: 'DEX aggregator volume' },
	'perps-aggregators': { endpoint: 'aggregator-derivatives', metricName: 'perps aggregator volume' },
	
	'user-fees': { endpoint: 'fees', dataType: 'dailyUserFees', metricName: 'user fees' },
	'holders-revenue': { endpoint: 'fees', dataType: 'dailyHoldersRevenue', metricName: 'holders revenue' },
	'protocol-revenue': { endpoint: 'fees', dataType: 'dailyProtocolRevenue', metricName: 'protocol revenue' },
	'supply-side-revenue': { endpoint: 'fees', dataType: 'dailySupplySideRevenue', metricName: 'supply side revenue' }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { dataType, chains, limit = '10', categories } = req.query
		const metric = dataType as string
		const topN = Math.min(parseInt(limit as string), 20) // Max 20 protocols
		const chainsArray = chains ? (chains as string).split(',').filter(Boolean) : ['all']
		const categoriesArray = categories ? (categories as string).split(',').filter(Boolean) : []

		const config = METRIC_CONFIG[metric]
		if (!config) {
			return res.status(400).json({ error: `Unsupported metric: ${metric}` })
		}

		
		const chainDataPromises = chainsArray.map(async (singleChain) => {
			let apiChain = singleChain
			if (singleChain === 'Optimism') {
				apiChain = 'op-mainnet'
			}
			
			let apiUrl = apiChain && apiChain !== 'all' 
				? `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}/${apiChain}?excludeTotalDataChartBreakdown=false`
				: `${DIMENISIONS_OVERVIEW_API}/${config.endpoint}?excludeTotalDataChartBreakdown=false`

			if (config.dataType) {
				apiUrl += `&dataType=${config.dataType}`
			}

			try {
				const response = await fetch(apiUrl)
				if (!response.ok) {
					console.error(`API Error for ${metric} on ${singleChain}: ${response.status} - URL: ${apiUrl}`)
					return null
				}
				const data = await response.json()
				return { chain: singleChain, data }
			} catch (error) {
				console.error(`Error fetching data for ${singleChain}:`, error)
				return null
			}
		})

		const chainResults = (await Promise.all(chainDataPromises)).filter(Boolean)
		
		if (chainResults.length === 0) {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null,
					error: `No data available for chains: ${chainsArray.join(', ')}`
				}
			})
		}

		const aggregatedBreakdown = new Map<number, Map<string, number>>()
		
		for (const result of chainResults) {
			const { data } = result
			if (!data.totalDataChartBreakdown || !Array.isArray(data.totalDataChartBreakdown)) continue
			
			data.totalDataChartBreakdown.forEach((item: any) => {
				const [timestamp, protocols] = item
				if (!protocols) return
				
				if (!aggregatedBreakdown.has(timestamp)) {
					aggregatedBreakdown.set(timestamp, new Map())
				}
				
				const timestampData = aggregatedBreakdown.get(timestamp)!
				
				Object.entries(protocols).forEach(([protocolName, value]) => {
					const currentValue = timestampData.get(protocolName) || 0
					timestampData.set(protocolName, currentValue + (value as number))
				})
			})
		}

		const data = {
			totalDataChartBreakdown: Array.from(aggregatedBreakdown.entries())
				.sort(([a], [b]) => a - b)
				.map(([timestamp, protocols]) => [
					timestamp,
					Object.fromEntries(protocols.entries())
				])
		}
		
		if (!data.totalDataChartBreakdown || !Array.isArray(data.totalDataChartBreakdown)) {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null
				}
			})
		}

		const lastDayData = data.totalDataChartBreakdown[data.totalDataChartBreakdown.length - 1]
		if (!lastDayData || !lastDayData[1]) {
			return res.status(200).json({
				series: [],
				metadata: {
					chain: chainsArray.join(','),
					chains: chainsArray,
					categories: categoriesArray,
					metric: config.metricName,
					topN,
					totalProtocols: 0,
					othersCount: 0,
					marketSector: categoriesArray.join(',') || null
				}
			})
		}

		const lastDayProtocols = lastDayData[1]
		
		let protocolCategories: Map<string, string> = new Map()
		if (categoriesArray.length > 0) {
			const protocolsResponse = await fetch(PROTOCOLS_API)
			const protocolsData = await protocolsResponse.json()
			const protocols = protocolsData.protocols || []
			
			protocols.forEach((protocol: any) => {
				if (protocol.name && protocol.category) {
					protocolCategories.set(protocol.name, protocol.category)
				}
			})
		}
		
		let protocolEntries = Object.entries(lastDayProtocols)
			.map(([name, value]) => ({ name, value: value as number }))
			
		if (categoriesArray.length > 0 && protocolCategories.size > 0) {
			protocolEntries = protocolEntries.filter(p => 
				categoriesArray.includes(protocolCategories.get(p.name) || '')
			)
		}
		
		protocolEntries.sort((a, b) => b.value - a.value)
		
		const topProtocols = protocolEntries.slice(0, topN).map(p => p.name)
		const topProtocolsSet = new Set(topProtocols)

		const protocolData: Map<string, [number, number][]> = new Map()
		topProtocols.forEach(protocol => {
			protocolData.set(protocol, [])
		})

		const timestampTotals: Map<number, number> = new Map()
		const timestampTopTotals: Map<number, number> = new Map()

		data.totalDataChartBreakdown.forEach((item: any) => {
			const [timestamp, protocols] = item
			if (!protocols) return

			let dayTotal = 0
			let topTotal = 0

			Object.entries(protocols).forEach(([protocolName, value]) => {
				if (categoriesArray.length > 0 && protocolCategories.size > 0) {
					if (!categoriesArray.includes(protocolCategories.get(protocolName) || '')) {
						return
					}
				}
				
				const protocolValue = value as number
				dayTotal += protocolValue

				if (topProtocolsSet.has(protocolName)) {
					topTotal += protocolValue
					const series = protocolData.get(protocolName)
					if (series) {
						series.push([timestamp, protocolValue])
					}
				}
			})

			timestampTotals.set(timestamp, dayTotal)
			timestampTopTotals.set(timestamp, topTotal)
		})

		const allTimestamps = Array.from(timestampTotals.keys()).sort((a, b) => a - b)
		
		const series: ChartSeries[] = []
		
		topProtocols.forEach((protocol, index) => {
			const protocolDataMap = new Map(protocolData.get(protocol) || [])
			
			const alignedData: [number, number][] = allTimestamps.map(timestamp => {
				return [timestamp, protocolDataMap.get(timestamp) || 0]
			})
			
			series.push({
				name: protocol,
				data: alignedData,
				color: COLORS[index % COLORS.length]
			})
		})

		const othersData: [number, number][] = allTimestamps.map(timestamp => {
			const total = timestampTotals.get(timestamp) || 0
			const topTotal = timestampTopTotals.get(timestamp) || 0
			const othersValue = Math.max(0, total - topTotal)
			return [timestamp, othersValue]
		})

		const hasOthersData = othersData.some(([_, value]) => value > 0)
		if (hasOthersData) {
			const othersCount = protocolEntries.length - topN
			series.push({
				name: `Others (${othersCount} protocols)`,
				data: othersData,
				color: '#999999'
			})
		}

		res.status(200).json({
			series,
			metadata: {
				chain: chainsArray.join(','),
				chains: chainsArray,
				categories: categoriesArray,
				metric: config.metricName,
				topN,
				totalProtocols: protocolEntries.length,
				othersCount: Math.max(0, protocolEntries.length - topN),
				marketSector: categoriesArray.join(',') || null
			}
		})
	} catch (error) {
		const metric = req.query.dataType as string
		console.error(`Error in ${metric} split API:`, error)
		res.status(500).json({ 
			error: `Failed to fetch protocol ${metric} data`,
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}