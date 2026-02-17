import { PROTOCOLS_API } from '~/constants'
import type { ILiteParentProtocol, ILiteProtocol } from '~/containers/ChainOverview/types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import {
	fetchOracleMetrics,
	fetchOracleProtocolBreakdownChart,
	fetchOracleChainBreakdownChart,
	fetchOracleProtocolChart,
	fetchOracleProtocolChainBreakdownChart,
	fetchOracleChainProtocolBreakdownChart
} from './api'
import type {
	OracleBreakdownItem,
	OracleChartData,
	OracleChainPageData,
	OraclePageData,
	OracleOverviewChartData,
	OracleProtocolWithBreakdown,
	OracleProtocolsCount
} from './types'

type TOracleTvsByOracle = Record<string, Record<string, Record<string, number>>>
type TProtocolsApiResponse = {
	protocols: Array<ILiteProtocol>
	chains: Array<string>
	parentProtocols: Array<ILiteParentProtocol>
}

const EMPTY_PROTOCOLS_API_RESPONSE: TProtocolsApiResponse = {
	protocols: [],
	chains: [],
	parentProtocols: []
}

function resolveCanonicalName(value: string, options: Array<string>): string | null {
	const normalizedValue = slug(value)

	for (const option of options) {
		if (option === value) {
			return option
		}

		if (slug(option) === normalizedValue) {
			return option
		}
	}

	return null
}

function getAllChains(chainsByOracle: Record<string, Array<string>>): Array<string> {
	return Array.from(new Set(Object.values(chainsByOracle).flat()))
}

function toOracleTvlBreakdownChartData(protocolBreakdown: ReadonlyArray<OracleBreakdownItem>): OracleChartData {
	return protocolBreakdown.map((dayData) => {
		const values: Record<string, Record<string, number>> = {}
		for (const [name, value] of Object.entries(dayData)) {
			if (name === 'timestamp') continue
			values[name] = { tvl: value }
		}
		return [dayData.timestamp, values]
	})
}

function toSingleOracleChartData(
	oracle: string,
	chartData: Awaited<ReturnType<typeof fetchOracleProtocolChart>>
): OracleOverviewChartData {
	return chartData.map(([timestamp, value]) => ({
		timestamp,
		[oracle]: value
	}))
}

function toSingleChainChartData(
	oracle: string,
	chain: string,
	chainBreakdown: Awaited<ReturnType<typeof fetchOracleProtocolChainBreakdownChart>>
): OracleOverviewChartData {
	const chartData: OracleOverviewChartData = []
	for (const dayData of chainBreakdown) {
		const chainValue = dayData[chain]
		if (typeof chainValue !== 'number') {
			continue
		}
		chartData.push({
			timestamp: dayData.timestamp,
			[oracle]: chainValue
		})
	}
	return chartData
}

function getLatestTvlByChain(chainBreakdown: ReadonlyArray<OracleBreakdownItem> | null): Record<string, number> {
	if (!chainBreakdown || chainBreakdown.length === 0) {
		return {}
	}

	const latestDayData = chainBreakdown[chainBreakdown.length - 1]

	const latestTvlByChain: Record<string, number> = {}
	for (const [chainName, value] of Object.entries(latestDayData)) {
		if (chainName === 'timestamp') continue
		if (!chainName.includes('-') && !TVL_SETTINGS_KEYS_SET.has(chainName)) {
			latestTvlByChain[chainName] = value
		}
	}
	return latestTvlByChain
}

function buildColors(oracles: Array<string>): Record<string, string> {
	const allColors = getNDistinctColors(oracles.length)
	const colors: Record<string, string> = {}

	for (let i = 0; i < oracles.length; i++) {
		colors[oracles[i]] = allColors[i]
	}

	colors['Others'] = '#AAAAAA'

	return colors
}

function buildOracleProtocolsCount(oraclesTVS: TOracleTvsByOracle): OracleProtocolsCount {
	const oracleProtocolsCount: OracleProtocolsCount = {}
	for (const [oracleName, protocolsByOracle] of Object.entries(oraclesTVS)) {
		let protocolsCount = 0
		for (const _protocolName in protocolsByOracle ?? {}) {
			protocolsCount += 1
		}
		oracleProtocolsCount[oracleName] = protocolsCount
	}
	return oracleProtocolsCount
}

function buildOracleProtocolsCountByChain({
	protocols,
	chain,
	oracles
}: {
	protocols: ReadonlyArray<ILiteProtocol>
	chain: string
	oracles: ReadonlyArray<string>
}): OracleProtocolsCount {
	const oracleProtocolsCount: OracleProtocolsCount = {}
	for (const oracleName of oracles) {
		oracleProtocolsCount[oracleName] = 0
	}

	for (const protocol of protocols) {
		if (!protocol.chains.includes(chain)) continue
		const protocolOracles = protocol.oraclesByChain?.[chain] ?? protocol.oracles ?? []
		for (const oracleName of new Set(protocolOracles)) {
			if (oracleName in oracleProtocolsCount) {
				oracleProtocolsCount[oracleName] += 1
			}
		}
	}
	return oracleProtocolsCount
}

function buildOracleProtocolBreakdown({
	protocol,
	protocolOracleData,
	chain
}: {
	protocol: ILiteProtocol
	protocolOracleData: Record<string, number> | undefined
	chain: string | null
}): { tvl: number; extraTvl: Record<string, { tvl: number }> } {
	let tvl = 0
	const extraTvl: Record<string, { tvl: number }> = {}

	if (!protocolOracleData) {
		return { tvl, extraTvl }
	}

	for (const [breakdownKey, value] of Object.entries(protocolOracleData)) {
		const keyParts = breakdownKey.split('-')
		if (keyParts.length === 1 && !protocol.chains.includes(keyParts[0])) {
			continue
		}

		const chainName = keyParts[0]
		if (chain && chainName !== chain) {
			continue
		}

		const category = keyParts.length > 1 ? keyParts.slice(1).join('-') : 'tvl'
		if (category === 'tvl') {
			tvl += value
			continue
		}

		const currentValue = extraTvl[category]?.tvl ?? 0
		extraTvl[category] = { tvl: currentValue + value }
	}

	return { tvl, extraTvl }
}

// - /oracles, /oracles/chain/:chain
export async function getOraclesListPageData({
	chain = null
}: {
	chain?: string | null
} = {}): Promise<OracleChainPageData | null> {
	const [metrics, { protocols }]: [Awaited<ReturnType<typeof fetchOracleMetrics>>, TProtocolsApiResponse] = await Promise.all([
		fetchOracleMetrics(),
		chain ? fetchJson<TProtocolsApiResponse>(PROTOCOLS_API) : Promise.resolve(EMPTY_PROTOCOLS_API_RESPONSE)
	])

	const chainsByOracle = metrics.chainsByOracle ?? {}
	const oraclesTVS = metrics.oraclesTVS ?? {}
	const allChains = getAllChains(chainsByOracle)
	const canonicalChain = chain ? resolveCanonicalName(chain, allChains) : null

	if (chain && !canonicalChain) {
		return null
	}

	const [chartBreakdown, chainBreakdown] = await Promise.all([
		canonicalChain
			? fetchOracleChainProtocolBreakdownChart({ chain: canonicalChain })
			: fetchOracleProtocolBreakdownChart(),
		fetchOracleChainBreakdownChart()
	])

	const chartData = toOracleTvlBreakdownChartData(chartBreakdown)
	const latestChartData = chartData[chartData.length - 1]?.[1] ?? {}
	const sortedOracles = Object.entries(latestChartData).toSorted(([, a], [, b]) => (b.tvl ?? 0) - (a.tvl ?? 0))
	const oracles: Array<string> = []
	for (const [oracleName] of sortedOracles) {
		if (!canonicalChain || chainsByOracle[oracleName]?.includes(canonicalChain)) {
			oracles.push(oracleName)
		}
	}

	const oracleProtocolsCount = canonicalChain
		? buildOracleProtocolsCountByChain({
				protocols,
				chain: canonicalChain,
				oracles: Object.keys(chainsByOracle)
			})
		: buildOracleProtocolsCount(oraclesTVS)

	const latestTvlByChain = getLatestTvlByChain(chainBreakdown)
	const uniqueChains = getAllChains(chainsByOracle).toSorted((a, b) => (latestTvlByChain[b] ?? 0) - (latestTvlByChain[a] ?? 0))
	const oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
		uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${slug(c)}` }))
	)

	const oraclesColors = buildColors(oracles)

	return {
		chain: canonicalChain,
		chainsByOracle,
		oracles,
		oracleLinks,
		oracleProtocolsCount,
		chartData,
		oraclesColors
	}
}

// - /oracles/:oracle, /oracles/:oracle/:chain
export async function getOracleDetailPageData({
	oracle,
	chain = null
}: {
	oracle: string
	chain?: string | null
}): Promise<OraclePageData | null> {
	const metrics = await fetchOracleMetrics()
	const chainsByOracle = metrics.chainsByOracle ?? {}
	const oraclesTVS = metrics.oraclesTVS ?? {}

	const oracleNames = Object.keys(oraclesTVS)
	const canonicalOracle = resolveCanonicalName(oracle, oracleNames)
	if (!canonicalOracle) {
		return null
	}

	const availableChains = chainsByOracle[canonicalOracle] ?? []
	const canonicalChain = chain ? resolveCanonicalName(chain, availableChains) : null
	if (chain && !canonicalChain) {
		return null
	}

	const [oracleChart, oracleChainBreakdown, { protocols }] = await Promise.all([
		fetchOracleProtocolChart({ protocol: canonicalOracle }),
		fetchOracleProtocolChainBreakdownChart({ protocol: canonicalOracle }),
		fetchJson<TProtocolsApiResponse>(PROTOCOLS_API)
	])

	const chartData = toSingleOracleChartData(canonicalOracle, oracleChart ?? [])
	const chainChartData =
		canonicalChain && oracleChainBreakdown
			? toSingleChainChartData(canonicalOracle, canonicalChain, oracleChainBreakdown)
			: null

	const oracleProtocols = oraclesTVS[canonicalOracle] ?? {}
	const filteredProtocols: Array<OracleProtocolWithBreakdown> = []
	for (const protocolData of protocols) {
		if (!(protocolData.name in oracleProtocols)) continue
		if (canonicalChain && !protocolData.chains.includes(canonicalChain)) continue

		const breakdown = buildOracleProtocolBreakdown({
			protocol: protocolData,
			protocolOracleData: oracleProtocols[protocolData.name],
			chain: canonicalChain
		})

		filteredProtocols.push({
			...protocolData,
			tvl: breakdown.tvl,
			extraTvl: breakdown.extraTvl
		})
	}
	filteredProtocols.sort((a, b) => b.tvl - a.tvl)

	const latestOracleTvlByChain = getLatestTvlByChain(oracleChainBreakdown)
	const oracleChains = (chainsByOracle[canonicalOracle] ?? []).toSorted(
		(a, b) => (latestOracleTvlByChain[b] ?? 0) - (latestOracleTvlByChain[a] ?? 0)
	)
	const oracleLinks = [{ label: 'All', to: `/oracles/${slug(canonicalOracle)}` }].concat(
		oracleChains.map((c) => ({ label: c, to: `/oracles/${slug(canonicalOracle)}/${slug(c)}` }))
	)

	const oraclesColors = buildColors([canonicalOracle])
	const oracleProtocolsCount = buildOracleProtocolsCount(oraclesTVS)

	return {
		chain: canonicalChain ?? null,
		chainChartData,
		chainsByOracle,
		oracles: [canonicalOracle],
		oracleLinks,
		oracle: canonicalOracle,
		oracleProtocolsCount,
		filteredProtocols,
		chartData,
		oraclesColors
	}
}

export async function getOraclesPagePaths(): Promise<Array<{ params: { oracle: string } }>> {
	const metrics = await fetchOracleMetrics()
	const oracleNames = Object.keys(metrics.oracles ?? {}).toSorted((a, b) => a.localeCompare(b))
	return oracleNames.slice(0, 10).map((oracle) => ({ params: { oracle: slug(oracle) } }))
}
