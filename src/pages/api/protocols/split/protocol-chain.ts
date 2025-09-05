import { NextApiRequest, NextApiResponse } from 'next'
import { DIMENISIONS_SUMMARY_BASE_API, PROTOCOL_API } from '~/constants'
import { EXTENDED_COLOR_PALETTE } from '~/containers/ProDashboard/utils/colorManager'

interface ChartSeries {
	name: string
	data: [number, number][]
	color?: string
}

interface ProtocolChainData {
	series: ChartSeries[]
	metadata: {
		protocol: string
		metric: string
		chains: string[]
		totalChains: number
		topN?: number
		othersCount?: number
	}
}

const METRIC_CONFIG: Record<string, { endpoint: string; dataType?: string; metricName: string }> = {
	tvl: { endpoint: 'tvl', metricName: 'TVL' },
	fees: { endpoint: 'fees', metricName: 'fees' },
	revenue: { endpoint: 'fees', dataType: 'dailyRevenue', metricName: 'revenue' },
	volume: { endpoint: 'dexs', metricName: 'volume' },
	perps: { endpoint: 'derivatives', metricName: 'perps volume' },
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

const toUtcDay = (ts: number): number => Math.floor(ts / 86400) * 86400

const normalizeChainKey = (chain: string): string => {
	const lc = chain.toLowerCase()
	if (lc === 'optimism' || lc === 'op mainnet' || lc === 'op-mainnet') return 'OP Mainnet'
	return chain
}

const normalizeDailyPairs = (pairs: [number, number][]): [number, number][] => {
	const daily = new Map<number, number>()
	for (const [ts, v] of pairs) {
		const day = toUtcDay(Number(ts))
		daily.set(day, (daily.get(day) || 0) + (v || 0))
	}
	return Array.from(daily.entries()).sort((a, b) => a[0] - b[0]) as [number, number][]
}

const startOfTodayUtc = (): number => {
	const now = new Date()
	return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000)
}

const filterOutToday = (pairs: [number, number][]): [number, number][] => {
	const today = startOfTodayUtc()
	return pairs.filter(([ts]) => ts < today)
}

const sumSeriesByTimestamp = (seriesList: [number, number][][]): Map<number, number> => {
	const acc = new Map<number, number>()
	for (const series of seriesList) {
		for (const [ts, val] of series) {
			acc.set(ts, (acc.get(ts) || 0) + (val || 0))
		}
	}
	return acc
}

const alignSeries = (timestamps: number[], series: [number, number][]): [number, number][] => {
	const map = new Map(series.map(([t, v]) => [t, v]))
	return timestamps.map((t) => [t, map.get(t) || 0])
}

async function getTvlProtocolChainData(
	protocol: string,
	chains?: string[],
	topN: number = 5,
	filterMode: 'include' | 'exclude' = 'include'
): Promise<ProtocolChainData> {
	try {
		const response = await fetch(`${PROTOCOL_API}/${protocol}`)
		if (!response.ok) {
			throw new Error(`Failed to fetch TVL data: ${response.statusText}`)
		}

		const data = await response.json()
		const chainTvls = data?.chainTvls || {}

		const series: ChartSeries[] = []
		const availableChains: string[] = []
		let colorIndex = 0

		const excludeSet = new Set<string>((chains || []).map((c) => normalizeChainKey(c)))
		for (const [chainKey, chainData] of Object.entries(chainTvls)) {
			if (
				chainKey.includes('-borrowed') ||
				chainKey.includes('-pool2') ||
				chainKey.includes('-staking') ||
				chainKey === 'borrowed' ||
				chainKey === 'pool2' ||
				chainKey === 'staking'
			) {
				continue
			}

			if (chains && chains.length > 0) {
				if (filterMode === 'include') {
					if (!chains.includes(chainKey)) continue
				} else {
					if (excludeSet.has(chainKey)) continue
				}
			}

			const tvlArray = (chainData as any)?.tvl || []
			if (Array.isArray(tvlArray) && tvlArray.length > 0) {
				const mapped = tvlArray.map(
					(d: any) => [toUtcDay(Number(d.date)), Number(d.totalLiquidityUSD) || 0] as [number, number]
				)
				const normalized = filterOutToday(normalizeDailyPairs(mapped))

				if (normalized.length > 0) {
					series.push({
						name: chainKey,
						data: normalized,
						color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length]
					})
					availableChains.push(chainKey)
					colorIndex++
				}
			}
		}

		series.sort((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const topSeries = series.slice(0, Math.min(topN, series.length))
		const othersSeries = series.slice(Math.min(topN, series.length))

		const timestampSet = new Set<number>()
		series.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
		const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const alignedTopSeries = topSeries.map((s) => ({
			...s,
			data: alignSeries(allTimestamps, s.data)
		}))
		const alignedTotal = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(series.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
		const topSumPerTs = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(alignedTopSeries.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)

		const othersData: [number, number][] = allTimestamps.map((t, i) => {
			const total = alignedTotal[i]?.[1] || 0
			const topSum = topSumPerTs[i]?.[1] || 0
			const rest = Math.max(0, total - topSum)
			return [t, rest]
		})

		const hasOthers = othersSeries.length > 0 && othersData.some(([, v]) => v > 0)

		const finalSeries: ChartSeries[] = [...alignedTopSeries]
		if (hasOthers) {
			finalSeries.push({
				name: `Others (${othersSeries.length} chains)`,
				data: othersData,
				color: '#999999'
			})
		}

		return {
			series: finalSeries,
			metadata: {
				protocol: data.name || protocol,
				metric: 'TVL',
				chains: availableChains,
				totalChains: availableChains.length,
				topN: Math.min(topN, series.length),
				othersCount: Math.max(0, series.length - Math.min(topN, series.length))
			}
		}
	} catch (error) {
		console.error(`Error fetching TVL for protocol ${protocol}:`, error)
		return {
			series: [],
			metadata: {
				protocol,
				metric: 'TVL',
				chains: [],
				totalChains: 0
			}
		}
	}
}

async function getDimensionsProtocolChainData(
	protocol: string,
	metric: string,
	chains?: string[],
	topN: number = 5,
	filterMode: 'include' | 'exclude' = 'include'
): Promise<ProtocolChainData> {
	const config = METRIC_CONFIG[metric]
	if (!config) {
		throw new Error(`Unsupported metric: ${metric}`)
	}

	try {
		let apiUrl = `${DIMENISIONS_SUMMARY_BASE_API}/${config.endpoint}/${protocol}`
		if (config.dataType) {
			apiUrl += `?dataType=${config.dataType}`
		}

		const response = await fetch(apiUrl)
		if (!response.ok) {
			throw new Error(`Failed to fetch ${metric} data: ${response.statusText}`)
		}

		const data = await response.json()

		const breakdown = data?.totalDataChartBreakdown || []
		if (!Array.isArray(breakdown) || breakdown.length === 0) {
			return {
				series: [],
				metadata: {
					protocol,
					metric: config.metricName,
					chains: [],
					totalChains: 0
				}
			}
		}

		const chainDataMap = new Map<string, [number, number][]>()

		const excludeSet = new Set<string>((chains || []).map((c) => c))
		breakdown.forEach((item: any) => {
			const [timestamp, chainData] = item
			if (!chainData || typeof chainData !== 'object') return

			Object.entries(chainData).forEach(([chain, versions]: [string, any]) => {
				if (chains && chains.length > 0) {
					if (filterMode === 'include') {
						if (!chains.includes(chain)) return
					} else {
						if (excludeSet.has(chain)) return
					}
				}

				if (typeof versions === 'object' && versions !== null) {
					let chainTotal = 0
					Object.values(versions).forEach((value: any) => {
						if (typeof value === 'number') {
							chainTotal += value
						}
					})

					if (chainTotal > 0) {
						if (!chainDataMap.has(chain)) {
							chainDataMap.set(chain, [])
						}
						chainDataMap.get(chain)!.push([timestamp, chainTotal])
					}
				}
			})
		})

		const series: ChartSeries[] = []
		let colorIndex = 0

		Array.from(chainDataMap.entries()).forEach(([chain, data]) => {
			const sortedData = data.sort((a, b) => a[0] - b[0])
			series.push({
				name: chain,
				data: filterOutToday(sortedData),
				color: EXTENDED_COLOR_PALETTE[colorIndex % EXTENDED_COLOR_PALETTE.length]
			})
			colorIndex++
		})

		series.sort((a, b) => {
			const lastA = a.data[a.data.length - 1]?.[1] || 0
			const lastB = b.data[b.data.length - 1]?.[1] || 0
			return lastB - lastA
		})

		const availableChains = series.map((s) => s.name)

		const topSeries = series.slice(0, Math.min(topN, series.length))
		const othersSeries = series.slice(Math.min(topN, series.length))

		const timestampSet = new Set<number>()
		series.forEach((s) => s.data.forEach(([t]) => timestampSet.add(t)))
		const allTimestamps = Array.from(timestampSet).sort((a, b) => a - b)

		const alignedTopSeries = topSeries.map((s) => ({
			...s,
			data: alignSeries(allTimestamps, s.data)
		}))
		const alignedTotal = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(series.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)
		const topSumPerTs = alignSeries(
			allTimestamps,
			Array.from(sumSeriesByTimestamp(alignedTopSeries.map((s) => s.data)).entries()).sort((a, b) => a[0] - b[0]) as [
				number,
				number
			][]
		)

		const othersData: [number, number][] = allTimestamps.map((t, i) => {
			const total = alignedTotal[i]?.[1] || 0
			const topSum = topSumPerTs[i]?.[1] || 0
			const rest = Math.max(0, total - topSum)
			return [t, rest]
		})

		const hasOthers = othersSeries.length > 0 && othersData.some(([, v]) => v > 0)

		const finalSeries: ChartSeries[] = [...alignedTopSeries]
		if (hasOthers) {
			finalSeries.push({
				name: `Others (${othersSeries.length} chains)`,
				data: othersData,
				color: '#999999'
			})
		}

		return {
			series: finalSeries,
			metadata: {
				protocol,
				metric: config.metricName,
				chains: availableChains,
				totalChains: availableChains.length,
				topN: Math.min(topN, series.length),
				othersCount: Math.max(0, series.length - Math.min(topN, series.length))
			}
		}
	} catch (error) {
		console.error(`Error fetching ${metric} for protocol ${protocol}:`, error)
		return {
			series: [],
			metadata: {
				protocol,
				metric: config.metricName,
				chains: [],
				totalChains: 0
			}
		}
	}
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { protocol, metric = 'tvl', chains, limit = '5', filterMode } = req.query

		if (!protocol || typeof protocol !== 'string') {
			return res.status(400).json({ error: 'Protocol parameter is required' })
		}

		const metricStr = metric as string
		const chainsArray = chains ? (chains as string).split(',').filter(Boolean) : undefined
		const fm = filterMode === 'exclude' ? 'exclude' : 'include'
		const topN = Math.min(parseInt(limit as string), 20)

		let result: ProtocolChainData

		if (metricStr === 'tvl') {
			result = await getTvlProtocolChainData(protocol, chainsArray, topN, fm)
		} else {
			result = await getDimensionsProtocolChainData(protocol, metricStr, chainsArray, topN, fm)
		}

		res.status(200).json(result)
	} catch (error) {
		console.error('Error in protocol-chain split API:', error)
		res.status(500).json({
			error: 'Failed to fetch protocol chain data',
			details: error instanceof Error ? error.message : 'Unknown error'
		})
	}
}
