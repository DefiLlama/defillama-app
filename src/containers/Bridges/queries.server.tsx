import type { LlamaConfigResponse } from '~/api/types'
import { preparePieChartData } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { CONFIG_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import { chainIconUrl, getNDistinctColors, slug, tokenIconUrl } from '~/utils'
import { fetchJson } from '~/utils/async'
import {
	fetchBridgeDayStats,
	fetchBridges,
	fetchBridgeLargeTransactions,
	fetchBridgeNetflows,
	fetchBridgeTxCounts,
	fetchBridgeVolumeAll,
	fetchBridgeVolumeByChain
} from './api'
import type {
	RawBridgeDayStats,
	RawBridgeDayStatsResponse,
	RawBridgeLargeTransactionsResponse,
	RawBridgeVolumePoint
} from './api.types'
import type { BridgePageData, BridgeTableData, BridgeVolumeChartPoint } from './types'
import { formatBridgesData, formatChainsData } from './utils'

const EMPTY_DAY_STATS: RawBridgeDayStats = {
	date: 0,
	totalTokensDeposited: {},
	totalTokensWithdrawn: {},
	totalAddressDeposited: {},
	totalAddressWithdrawn: {}
}

const isBridgeDayStatsResponse = (value: RawBridgeDayStatsResponse): value is RawBridgeDayStats => {
	return (
		typeof value === 'object' &&
		value !== null &&
		'date' in value &&
		'totalTokensDeposited' in value &&
		'totalTokensWithdrawn' in value &&
		'totalAddressDeposited' in value &&
		'totalAddressWithdrawn' in value
	)
}

const asBridgeDayStats = (value: RawBridgeDayStatsResponse): RawBridgeDayStats => {
	return isBridgeDayStatsResponse(value) ? value : EMPTY_DAY_STATS
}

type RetryOptions<T> = {
	attempts?: number
	fallback?: T
	context: string
	throwOnFailure?: boolean
	onFailureError?: () => Error
}

async function retryAsync<T>(operation: () => Promise<T>, options: RetryOptions<T>): Promise<T> {
	const { attempts = 5, fallback, context, throwOnFailure = false, onFailureError } = options
	let lastError: unknown = null
	for (let i = 0; i < attempts; i++) {
		try {
			return await operation()
		} catch (error) {
			lastError = error
		}
	}

	console.log(`[bridges][retry-failed] ${context}`, lastError)

	if (throwOnFailure) {
		throw onFailureError ? onFailureError() : new Error(`${context} failed`)
	}

	return fallback as T
}

type VolumeByDate = {
	[date: number]: BridgeVolumeChartPoint
}

type TokenTableUnformattedRow = {
	deposited?: number
	withdrawn?: number
	volume?: number
}

type AddressTableUnformattedRow = {
	deposited?: number
	withdrawn?: number
	txs?: number
}

type TokenMapValue = {
	symbol: string
	usdValue: number
}

type AddressMapValue = {
	txs: number
	usdValue: number
}

function buildVolumeDataByChain({
	volume,
	chains,
	destinationChain
}: {
	volume: RawBridgeVolumePoint[][]
	chains: string[]
	destinationChain: string
}): BridgePageData['volumeDataByChain'] {
	const volumeDataByChain: BridgePageData['volumeDataByChain'] = {}
	const volumeOnAllChains: VolumeByDate = {}
	const normalizeDailyBridgePoints = (
		points: BridgeVolumeChartPoint[]
	): BridgeVolumeChartPoint[] => {
		const byDay = new Map<number, BridgeVolumeChartPoint>()
		for (const point of points) {
			const utcDay = Math.floor(Number(point.date) / 86400) * 86400
			const existing = byDay.get(utcDay) ?? { date: utcDay, Deposited: 0, Withdrawn: 0 }
			byDay.set(utcDay, {
				date: utcDay,
				Deposited: existing.Deposited + Number(point.Deposited ?? 0),
				Withdrawn: existing.Withdrawn + Number(point.Withdrawn ?? 0)
			})
		}
		return Array.from(byDay.values()).sort((a, b) => a.date - b.date)
	}

	for (let index = 0; index < volume.length; index++) {
		const chainVolume = volume[index]
		const chartData: BridgeVolumeChartPoint[] = []

		for (const item of chainVolume) {
			const date = Number(item.date)
			chartData.push({ date, Deposited: item.depositUSD, Withdrawn: -item.withdrawUSD })

			if (!volumeOnAllChains[date]) {
				volumeOnAllChains[date] = { date, Deposited: 0, Withdrawn: 0 }
			}

			volumeOnAllChains[date] = {
				date,
				Deposited: volumeOnAllChains[date].Deposited + (item.depositUSD || 0),
				Withdrawn: volumeOnAllChains[date].Withdrawn - (item.withdrawUSD || 0)
			}
		}

		volumeDataByChain[chains[index]] = normalizeDailyBridgePoints(chartData)
	}

	volumeDataByChain['All Chains'] =
		destinationChain !== 'false'
			? normalizeDailyBridgePoints(volumeDataByChain?.[destinationChain] ?? [])
			: normalizeDailyBridgePoints(Object.values(volumeOnAllChains))

	return volumeDataByChain
}

function buildPrevDayDataByChain({
	statsOnPrevDay,
	chains,
	destinationChain
}: {
	statsOnPrevDay: RawBridgeDayStats[]
	chains: string[]
	destinationChain: string
}): Record<string, RawBridgeDayStats> {
	const prevDayDataByChain: Record<string, RawBridgeDayStats> = {}

	for (let index = 0; index < statsOnPrevDay.length; index++) {
		const data = statsOnPrevDay[index]
		prevDayDataByChain['All Chains'] = {
			date: Math.max(prevDayDataByChain['All Chains']?.date ?? 0, data.date),
			totalTokensDeposited: {
				...(prevDayDataByChain['All Chains']?.totalTokensDeposited ?? {}),
				...data.totalTokensDeposited
			},
			totalTokensWithdrawn: {
				...(prevDayDataByChain['All Chains']?.totalTokensWithdrawn ?? {}),
				...data.totalTokensWithdrawn
			},
			totalAddressDeposited: {
				...(prevDayDataByChain['All Chains']?.totalAddressDeposited ?? {}),
				...data.totalAddressDeposited
			},
			totalAddressWithdrawn: {
				...(prevDayDataByChain['All Chains']?.totalAddressWithdrawn ?? {}),
				...data.totalAddressWithdrawn
			}
		}

		prevDayDataByChain[chains[index]] = data
	}

	if (destinationChain !== 'false') {
		prevDayDataByChain[destinationChain] = prevDayDataByChain['All Chains']
	}

	return prevDayDataByChain
}

function buildTableDataByChain({
	prevDayDataByChain,
	chainsList
}: {
	prevDayDataByChain: Record<string, RawBridgeDayStats>
	chainsList: string[]
}): BridgePageData['tableDataByChain'] {
	const tableDataByChain: BridgePageData['tableDataByChain'] = {}

	for (const currentChain of chainsList) {
		const prevDayData = prevDayDataByChain[currentChain]
		let tokensTableData: BridgeTableData['tokensTableData'] = []
		let addressesTableData: BridgeTableData['addressesTableData'] = []
		let tokenDeposits: BridgeTableData['tokenDeposits'] = []
		let tokenWithdrawals: BridgeTableData['tokenWithdrawals'] = []
		let tokenColor: BridgeTableData['tokenColor'] = {}

		if (prevDayData) {
			const totalTokensDeposited = prevDayData.totalTokensDeposited
			const totalTokensWithdrawn = prevDayData.totalTokensWithdrawn
			const tokensTableUnformatted: Record<string, TokenTableUnformattedRow> = {}

			for (const token in totalTokensDeposited) {
				const tokenData = totalTokensDeposited[token] as TokenMapValue
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].deposited = (tokensTableUnformatted[key].deposited ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				// ensure there are no undefined values for deposited/withdrawn so table can be sorted
				tokensTableUnformatted[key].withdrawn = 0
			}
			for (const token in totalTokensWithdrawn) {
				const tokenData = totalTokensWithdrawn[token] as TokenMapValue
				const symbol = tokenData.symbol == null || tokenData.symbol === '' ? 'unknown' : tokenData.symbol
				const usdValue = tokenData.usdValue ?? 0
				const key = `${symbol}#${token}`
				tokensTableUnformatted[key] = tokensTableUnformatted[key] || {}
				tokensTableUnformatted[key].withdrawn = (tokensTableUnformatted[key].withdrawn ?? 0) + usdValue
				tokensTableUnformatted[key].volume = (tokensTableUnformatted[key].volume ?? 0) + usdValue
				if (!tokensTableUnformatted[key].deposited) {
					tokensTableUnformatted[key].deposited = 0
				}
			}

			tokensTableData = Object.entries(tokensTableUnformatted)
				.filter(([, volumeData]) => {
					return (volumeData.volume ?? 0) !== 0
				})
				.map((entry) => {
					return {
						symbol: entry[0],
						deposited: entry[1].deposited ?? 0,
						withdrawn: entry[1].withdrawn ?? 0,
						volume: entry[1].volume ?? 0
					}
				})

			let fullTokenDeposits: { name: string; value: number }[] = []
			for (const key in totalTokensDeposited) {
				const tokenData = totalTokensDeposited[key] as TokenMapValue
				fullTokenDeposits.push({ name: tokenData.symbol, value: tokenData.usdValue })
			}
			let fullTokenWithdrawals: { name: string; value: number }[] = []
			for (const key in totalTokensWithdrawn) {
				const tokenData = totalTokensWithdrawn[key] as TokenMapValue
				fullTokenWithdrawals.push({ name: tokenData.symbol, value: tokenData.usdValue })
			}

			if (currentChain === 'All Chains') {
				// Use for..in instead of Object.values() and Set for deduplication
				const symbolToDeposits = new Map<string, number>()
				for (const key in totalTokensDeposited) {
					const tokenData = totalTokensDeposited[key] as TokenMapValue
					const existing = symbolToDeposits.get(tokenData.symbol) ?? 0
					symbolToDeposits.set(tokenData.symbol, existing + tokenData.usdValue)
				}
				fullTokenDeposits = []
				for (const [symbol, value] of symbolToDeposits) {
					fullTokenDeposits.push({ name: symbol, value })
				}

				const symbolToWithdrawals = new Map<string, number>()
				for (const key in totalTokensWithdrawn) {
					const tokenData = totalTokensWithdrawn[key] as TokenMapValue
					const existing = symbolToWithdrawals.get(tokenData.symbol) ?? 0
					symbolToWithdrawals.set(tokenData.symbol, existing + tokenData.usdValue)
				}
				fullTokenWithdrawals = []
				for (const [symbol, value] of symbolToWithdrawals) {
					fullTokenWithdrawals.push({ name: symbol, value })
				}
			}

			tokenDeposits = preparePieChartData({
				data: fullTokenDeposits,
				limit: 15
			})
			tokenWithdrawals = preparePieChartData({
				data: fullTokenWithdrawals,
				limit: 15
			})

			const colors = getNDistinctColors(tokenDeposits.length + tokenWithdrawals.length)

			tokenColor = Object.fromEntries(
				[...tokenDeposits, ...tokenWithdrawals, 'Others'].map((token, i) => {
					return typeof token === 'string' ? ['-', colors[i] ?? '#AAAAAA'] : [token.name, colors[i] ?? '#AAAAAA']
				})
			)
			const totalAddressesDeposited = prevDayData.totalAddressDeposited
			const totalAddressesWithdrawn = prevDayData.totalAddressWithdrawn
			const addressesTableUnformatted: Record<string, AddressTableUnformattedRow> = {}
			for (const address in totalAddressesDeposited) {
				const addressData = totalAddressesDeposited[address] as AddressMapValue
				const txs = addressData.txs
				const usdValue = addressData.usdValue
				addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
				addressesTableUnformatted[address].deposited = (addressesTableUnformatted[address].deposited ?? 0) + usdValue
				addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
			}
			for (const address in totalAddressesWithdrawn) {
				const addressData = totalAddressesWithdrawn[address] as AddressMapValue
				const txs = addressData.txs
				const usdValue = addressData.usdValue
				addressesTableUnformatted[address] = addressesTableUnformatted[address] || {}
				addressesTableUnformatted[address].withdrawn = (addressesTableUnformatted[address].withdrawn ?? 0) + usdValue
				addressesTableUnformatted[address].txs = (addressesTableUnformatted[address].txs ?? 0) + txs
			}
			addressesTableData = Object.entries(addressesTableUnformatted)
				.filter(([, addressData]) => {
					return (addressData.txs ?? 0) !== 0
				})
				.map((entry) => {
					return {
						address: entry[0],
						deposited: entry[1].deposited ?? 0,
						withdrawn: entry[1].withdrawn ?? 0,
						txs: entry[1].txs ?? 0
					}
				})
		}

		tableDataByChain[currentChain] = {
			tokensTableData,
			addressesTableData,
			tokenDeposits,
			tokenWithdrawals,
			tokenColor
		}
	}

	return tableDataByChain
}

export const getBridges = () => fetchBridges(true).then(({ bridges, chains }) => ({ bridges, chains }))

const getChainVolumeData = async (chain: string, chainCoingeckoIds: Record<string, unknown>) => {
	if (chain) {
		if (chainCoingeckoIds[chain]) {
			const chart: RawBridgeVolumePoint[] = await retryAsync(() => fetchBridgeVolumeByChain(chain), {
				context: `fetchBridgeVolumeByChain(${chain})`,
				throwOnFailure: true,
				onFailureError: () => new Error(`bridge volume for chain ${chain} is broken`)
			})
			const formattedChart = chart.map((chart) => {
				// This is confusing, stats from the endpoint use "deposit" to mean deposit in bridge contract,
				// i.e., a withdrawal from the chain. Will eventually change that.
				return {
					date: chart.date,
					Deposits: chart.depositUSD,
					Withdrawals: -chart.withdrawUSD
				}
			})
			return { formatted: formattedChart, raw: chart }
		} else return { formatted: null, raw: [] }
	} else {
		const chart: RawBridgeVolumePoint[] = await fetchBridgeVolumeAll()
		const formattedChart = chart.map((chart) => {
			return {
				date: chart.date,
				volume: (chart.withdrawUSD + chart.depositUSD) / 2,
				txs: chart.depositTxs + chart.withdrawTxs
			}
		})
		return { formatted: formattedChart, raw: chart }
	}
}

const getLargeTransactionsData = async (chain: string, startTimestamp: number, endTimestamp: number) => {
	return retryAsync(() => fetchBridgeLargeTransactions(startTimestamp, endTimestamp, chain || undefined), {
		context: `fetchBridgeLargeTransactions(${chain || 'all'})`,
		fallback: [] as RawBridgeLargeTransactionsResponse
	})
}

const getBridgeTxCounts = async (chain?: string) => {
	return retryAsync(() => fetchBridgeTxCounts(chain || undefined), {
		context: `fetchBridgeTxCounts(${chain || 'all'})`,
		fallback: { bridges: [] }
	})
}

export async function getBridgeOverviewPageData(chain, options: { includeBridgeTxCounts?: boolean } = {}) {
	const includeBridgeTxCounts = options.includeBridgeTxCounts ?? false
	const [{ bridges, chains }, { chainCoingeckoIds }, bridgeTxCountsResponse] = await Promise.all([
		getBridges(),
		fetchJson<LlamaConfigResponse>(CONFIG_API),
		includeBridgeTxCounts ? getBridgeTxCounts(chain) : Promise.resolve({ bridges: [] })
	])
	const bridgeTxCountsById = new Map(
		(bridgeTxCountsResponse.bridges ?? []).map((bridge) => [Number(bridge.id), bridge.txsPrevDay ?? null])
	)
	const bridgesWithTxCounts = bridges.map((bridge) => ({
		...bridge,
		txsPrevDay: bridgeTxCountsById.get(Number(bridge.id)) ?? null
	}))

	let chartDataByBridge: Array<Array<{ date: string; volume: number; txs: number }>> = []
	let bridgeNames: string[] = []
	const bridgeNameToChartDataIndex: Record<string, number> = {}
	chartDataByBridge = await Promise.all(
		bridgesWithTxCounts.map(async (elem, i) => {
			bridgeNames.push(elem.displayName)
			bridgeNameToChartDataIndex[elem.displayName] = i
			const charts: RawBridgeVolumePoint[] = await retryAsync(
				() => (!chain ? fetchBridgeVolumeAll(elem.id) : fetchBridgeVolumeByChain(chain, elem.id)),
				{
					context: `fetchBridgeVolumeByBridge(${elem.id})`,
					fallback: [] as RawBridgeVolumePoint[]
				}
			)
			return charts.map((chart) => ({
				date: chart.date,
				volume: (chart.withdrawUSD + chart.depositUSD) / 2,
				txs: chart.depositTxs + chart.withdrawTxs
			}))
		})
	)

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.lastDailyVolume - a.lastDailyVolume
		})
		.map((chain) => chain.name)

	const chainVolumePromise = getChainVolumeData(chain, chainCoingeckoIds)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp
	const bridgeStatsPromise = chain
		? (async () => {
				return retryAsync(() => fetchBridgeDayStats(prevDayTimestamp, chain), {
					context: `fetchBridgeDayStats(${chain})`,
					fallback: {}
				})
			})()
		: Promise.resolve({})

	const numberOfDaysForLargeTx = chain ? 7 : 1
	const secondsInDay = 3600 * 24
	const largeTxsPromise = getLargeTransactionsData(
		chain,
		currentTimestamp - numberOfDaysForLargeTx * secondsInDay,
		currentTimestamp
	)

	const netflowsPromise = !chain
		? Promise.all([
				fetchBridgeNetflows('day').catch(() => []),
				fetchBridgeNetflows('week').catch(() => []),
				fetchBridgeNetflows('month').catch(() => [])
			]).then(([day, week, month]) => ({ day, week, month }))
		: Promise.resolve(null)

	const [chainVolumeResult, bridgeStatsCurrentDay, unformattedLargeTxsData, netflowsData] = await Promise.all([
		chainVolumePromise,
		bridgeStatsPromise,
		largeTxsPromise,
		netflowsPromise
	])
	const chainVolumeData = chainVolumeResult?.formatted ?? []
	const rawBridgeVolumeData = chainVolumeResult?.raw ?? []
	const largeTxsData = Array.isArray(unformattedLargeTxsData)
		? unformattedLargeTxsData.map((transaction) => {
				const { token, symbol, isDeposit, chain: txChain } = transaction
				const symbolAndTokenForExplorer = `${symbol}#${token}`
				let correctedIsDeposit = isDeposit
				if (chain) {
					correctedIsDeposit = chain.toLowerCase() === txChain.toLowerCase() ? isDeposit : !isDeposit
				}
				return { ...transaction, isDeposit: correctedIsDeposit, symbol: symbolAndTokenForExplorer }
			})
		: []

	const { bridges: filteredBridges, messagingProtocols } = formatBridgesData({
		bridges: bridgesWithTxCounts,
		chartDataByBridge,
		bridgeNameToChartDataIndex,
		chain
	})

	return {
		chains: chainList,
		filteredBridges,
		messagingProtocols,
		bridgeNames,
		bridgeNameToChartDataIndex,
		chartDataByBridge,
		chainVolumeData: chainVolumeData ?? [],
		rawBridgeVolumeData,
		netflowsData,
		bridgeStatsCurrentDay,
		largeTxsData,
		chain: chain ?? 'All'
	}
}

export async function getBridgeChainsPageData() {
	const { chains } = await getBridges()

	let chartDataByChain: RawBridgeVolumePoint[][] = []
	const chainToChartDataIndex: Record<string, number> = {}
	chartDataByChain = await Promise.all(
		chains.map(async (chain, i) => {
			chainToChartDataIndex[chain.name] = i
			return retryAsync(() => fetchBridgeVolumeByChain(chain.name), {
				context: `fetchBridgeVolumeByChain(${chain.name})`,
				fallback: [] as RawBridgeVolumePoint[]
			})
		})
	)

	let chartData: Record<string, Record<string, number>> = {}

	for (let i = 0; i < chains.length; i++) {
		const chain = chains[i]
		const charts = chartDataByChain[i]
		for (const chart of charts) {
			const date = chart.date
			const netFlow = chart.depositUSD - chart.withdrawUSD
			chartData[date] = chartData[date] || {}
			chartData[date][chain.name] = netFlow
		}
	}

	// order of chains will update every 24 hrs, can consider changing metric sorted by here
	const chainList = await chains
		.sort((a, b) => {
			return b.volumePrevDay - a.volumePrevDay
		})
		.map((chain) => chain.name)

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600

	let netflowsDataDay = null
	let netflowsDataWeek = null
	try {
		;[netflowsDataDay, netflowsDataWeek] = await Promise.all([
			fetchBridgeNetflows('day').catch(() => null),
			fetchBridgeNetflows('week').catch(() => null)
		])
	} catch (e) {
		console.log('Failed to fetch netflows data:', e)
	}

	let prevDayDataByChain = []
	prevDayDataByChain = (
		await Promise.all(
			chains.map(async (chain) => {
				const stats = await retryAsync(() => fetchBridgeDayStats(prevDayTimestamp, chain.name), {
					context: `fetchBridgeDayStats(${chain.name})`,
					fallback: null
				})
				if (stats === null) return undefined
				return { ...asBridgeDayStats(stats), name: chain.name }
				//throw new Error(`bridgedaystats for ${chain.name} is broken`)
			})
		)
	).filter((t) => t !== undefined)

	const filteredChains = formatChainsData({
		chains,
		chartDataByChain,
		chainToChartDataIndex,
		prevDayDataByChain,
		netflowsDataDay,
		netflowsDataWeek
	})

	const chartRows: Array<{ date: number; [key: string]: number }> = []
	for (const date in chartData) {
		chartRows.push({ date: Number(date), ...chartData[date] })
	}

	const chart = buildBridgeChainsMultiSeriesChart({ chartRows, chains: chainList })

	return {
		allChains: chainList,
		tableData: filteredChains,
		chart
	}
}

function buildBridgeChainsMultiSeriesChart({
	chartRows,
	chains
}: {
	chartRows: Array<{ date: number; [key: string]: number }>
	chains: string[]
}): {
	dataset: MultiSeriesChart2Dataset
	charts: NonNullable<IMultiSeriesChart2Props['charts']>
} {
	const source = (chartRows ?? [])
		.map((row) => {
			const { date, ...rest } = row
			return {
				timestamp: date * 1e3,
				...rest
			}
		})
		.filter((row) => Number.isFinite(Number(row.timestamp)))
		.toSorted((a, b) => Number(a.timestamp) - Number(b.timestamp))

	const dimensions = ['timestamp', ...(chains ?? [])]

	const charts = (chains ?? []).map((name, i) => ({
		type: 'bar' as const,
		name,
		encode: { x: 'timestamp', y: name },
		// Use per-series stacks so selected chains render as clustered bars (not stacked).
		stack: name,
		color: CHART_COLORS[i % CHART_COLORS.length],
		large: true
	}))

	return {
		dataset: { source, dimensions } satisfies MultiSeriesChart2Dataset,
		charts
	}
}

export async function getBridgePageData(bridge: string): Promise<BridgePageData | null> {
	// fetch list of all bridges
	const { bridges } = await getBridges()

	// find data of bridge
	const bridgeData = bridges.find((obj) => slug(obj.displayName) === slug(bridge) || slug(obj.slug) === slug(bridge))

	if (!bridgeData) {
		return null
	}

	const { id, chains, icon, displayName, destinationChain } = bridgeData

	const [iconType, iconName] = icon.split(':')
	// get logo based on icon type (chain or protocol)
	const logo = iconType === 'chain' ? chainIconUrl(iconName) : tokenIconUrl(iconName)
	const volume = await Promise.all(
		chains.map(async (chain) => {
			return retryAsync(() => fetchBridgeVolumeByChain(chain, id), {
				context: `fetchBridgeVolumeByChain(${chain},${id})`,
				throwOnFailure: true,
				onFailureError: () => new Error(`bridge volume for chain ${chain} is broken`)
			})
		})
	)
	const volumeDataByChain = buildVolumeDataByChain({ volume, chains, destinationChain })

	const currentTimestamp = Math.floor(new Date().getTime() / 1000 / 3600) * 3600
	// 25 hours behind current time, gives 1 hour for BRIDGEDAYSTATS to update, may change this
	const prevDayTimestamp = currentTimestamp - 86400 - 3600

	const statsOnPrevDay: RawBridgeDayStats[] = await Promise.all(
		chains.map(async (chain) => {
			const stats = await retryAsync(() => fetchBridgeDayStats(prevDayTimestamp, chain, id), {
				context: `fetchBridgeDayStats(${chain},${id})`,
				throwOnFailure: true,
				onFailureError: () => new Error(`bridgedaystats for chain ${chain} is broken`)
			})
			return asBridgeDayStats(stats)
		})
	)
	const prevDayDataByChain = buildPrevDayDataByChain({ statsOnPrevDay, chains, destinationChain })
	const chainsList = ['All Chains', ...chains, destinationChain !== 'false' ? destinationChain : null].filter(
		(chain): chain is string => Boolean(chain)
	)
	const tableDataByChain = buildTableDataByChain({
		prevDayDataByChain,
		chainsList
	})

	return {
		displayName,
		logo,
		chains: ['All Chains', ...chains],
		defaultChain: 'All Chains',
		volumeDataByChain,
		tableDataByChain,
		config: bridgeData
	} as BridgePageData
}

export const getBridgePageDatanew = getBridgePageData
