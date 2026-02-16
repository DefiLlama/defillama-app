import { PROTOCOLS_API } from '~/constants'
import { getProtocolsByChain } from '~/containers/ChainOverview/queries.server'
import type { ILiteParentProtocol, ILiteProtocol, IProtocol } from '~/containers/ChainOverview/types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import metadataCache, { refreshMetadataIfStale } from '~/utils/metadata'
import {
	fetchOracleMetrics,
	fetchOracleProtocolBreakdownChart,
	fetchOracleChainBreakdownChart,
	fetchOracleProtocolChart,
	fetchOracleProtocolChainBreakdownChart,
	fetchOracleChainProtocolBreakdownChart
} from './api'

type IOracleProtocols = Record<string, number>
type TOracleTvsByOracle = Record<string, Record<string, Record<string, number>>>
type TOracleBreakdownItem = { timestamp: number } & Record<string, number>
type TOracleChartData = Array<[number, Record<string, { tvl: number }>]>
type TOracleSingleChartData = Array<[number, Record<string, number>]>
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

interface IOracleProtocolWithBreakdown extends ILiteProtocol {
	tvl: number
	extraTvl: Record<string, { tvl: number }>
}

interface INotFoundResponse {
	notFound: true
}

export interface IOracleLink {
	label: string
	to: string
}

export interface IOraclePageData {
	chain: string | null
	chainChartData: TOracleSingleChartData | null
	chainsByOracle: Record<string, Array<string>>
	protocolsTableData: Array<IProtocol>
	tokens: Array<string>
	tokenLinks: Array<IOracleLink>
	token: string | null
	tokensProtocols: IOracleProtocols
	filteredProtocols: Array<IOracleProtocolWithBreakdown>
	chartData: TOracleChartData
	oraclesColors: Record<string, string>
}

export interface IOracleChainPageData {
	chain: string | null
	chainsByOracle: Record<string, Array<string>>
	tokens: Array<string>
	tokenLinks: Array<IOracleLink>
	tokensProtocols: IOracleProtocols
	chartData: TOracleChartData
	oraclesColors: Record<string, string>
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

function toOracleBreakdownChartData(protocolBreakdown: ReadonlyArray<TOracleBreakdownItem>): TOracleChartData {
	return protocolBreakdown.map((dayData) => {
		const values: Record<string, { tvl: number }> = {}
		for (const [name, value] of Object.entries(dayData)) {
			if (name === 'timestamp') continue
			values[name] = { tvl: value }
		}
		return [dayData.timestamp, values]
	})
}

function toSingleOracleChartData(oracle: string, chartData: Awaited<ReturnType<typeof fetchOracleProtocolChart>>): TOracleChartData {
	return chartData.map(([timestamp, value]) => [timestamp, { [oracle]: { tvl: value } }])
}

function toSingleChainChartData(
	chain: string,
	chainBreakdown: Awaited<ReturnType<typeof fetchOracleProtocolChainBreakdownChart>>
): TOracleSingleChartData {
	const chartData: TOracleSingleChartData = []
	for (const dayData of chainBreakdown) {
		const chainValue = dayData[chain]
		if (typeof chainValue !== 'number') {
			continue
		}
		chartData.push([dayData.timestamp, { tvl: chainValue }])
	}
	return chartData
}

function getLatestTvlByChain(chainBreakdown: ReadonlyArray<TOracleBreakdownItem> | null): Record<string, number> {
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

function buildTokensProtocols(oraclesTVS: TOracleTvsByOracle): IOracleProtocols {
	const tokensProtocols: IOracleProtocols = {}
	for (const [oracleName, protocolsByOracle] of Object.entries(oraclesTVS)) {
		let protocolsCount = 0
		for (const _protocolName in protocolsByOracle ?? {}) {
			protocolsCount += 1
		}
		tokensProtocols[oracleName] = protocolsCount
	}
	return tokensProtocols
}

function buildTokensProtocolsByChain({
	protocols,
	chain,
	oracles
}: {
	protocols: ReadonlyArray<ILiteProtocol>
	chain: string
	oracles: ReadonlyArray<string>
}): IOracleProtocols {
	const tokensProtocols: IOracleProtocols = {}
	for (const oracleName of oracles) {
		tokensProtocols[oracleName] = 0
	}

	for (const protocol of protocols) {
		if (!protocol.chains.includes(chain)) continue
		const protocolOracles = protocol.oraclesByChain?.[chain] ?? protocol.oracles ?? []
		for (const oracleName of new Set(protocolOracles)) {
			if (oracleName in tokensProtocols) {
				tokensProtocols[oracleName] += 1
			}
		}
	}
	return tokensProtocols
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

async function getOracleProtocolsTableData({
	oracle,
	chain
}: {
	oracle: string | null
	chain: string | null
}): Promise<Array<IProtocol>> {
	if (!oracle) return []

	await refreshMetadataIfStale()

	const data = await getProtocolsByChain({
		chain: chain ?? 'All',
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata,
		oracle
	})

	return data?.protocols ?? []
}

// - used in /oracles, /oracles/[oracle], and /oracles/[oracle]/[chain]
export async function getOraclePageData(
	{ oracle = null, chain = null }: { oracle?: string | null; chain?: string | null } = {}
): Promise<IOraclePageData | INotFoundResponse | null> {
	try {
		const metrics = await fetchOracleMetrics()
		const chainsByOracle = metrics.chainsByOracle ?? {}
		const oraclesTVS = metrics.oraclesTVS ?? {}

		const oracleNames = Object.keys(oraclesTVS)
		const canonicalOracle = oracle ? resolveCanonicalName(oracle, oracleNames) : null

		if (oracle && !canonicalOracle) {
			return { notFound: true }
		}

		const availableChains = canonicalOracle ? chainsByOracle[canonicalOracle] ?? [] : getAllChains(chainsByOracle)
		const canonicalChain = chain ? resolveCanonicalName(chain, availableChains) : null

		if (chain && !canonicalChain) {
			return { notFound: true }
		}

		const shouldFetchProtocolData = canonicalOracle !== null
		const protocolDataPromise: Promise<TProtocolsApiResponse> = shouldFetchProtocolData
			? fetchJson(PROTOCOLS_API)
			: Promise.resolve(EMPTY_PROTOCOLS_API_RESPONSE)

		const [protocolBreakdown, chainBreakdown, oracleChart, oracleChainBreakdown, protocolsTableData] = await Promise.all([
			canonicalOracle ? Promise.resolve(null) : fetchOracleProtocolBreakdownChart(),
			canonicalOracle ? Promise.resolve(null) : fetchOracleChainBreakdownChart(),
			canonicalOracle ? fetchOracleProtocolChart({ protocol: canonicalOracle }) : Promise.resolve(null),
			canonicalOracle ? fetchOracleProtocolChainBreakdownChart({ protocol: canonicalOracle }) : Promise.resolve(null),
			getOracleProtocolsTableData({ oracle: canonicalOracle, chain: canonicalChain })
		])
		const { protocols } = await protocolDataPromise

		const chartData: TOracleChartData = canonicalOracle
			? toSingleOracleChartData(canonicalOracle, oracleChart ?? [])
			: toOracleBreakdownChartData(protocolBreakdown ?? [])

		let filteredProtocols: Array<IOracleProtocolWithBreakdown> = []
		if (canonicalOracle) {
			const oracleProtocols = oraclesTVS[canonicalOracle] ?? {}
			const nextFilteredProtocols: Array<IOracleProtocolWithBreakdown> = []
			for (const protocol of protocols) {
				if (!(protocol.name in oracleProtocols)) continue
				if (canonicalChain && !protocol.chains.includes(canonicalChain)) continue

				const breakdown = buildOracleProtocolBreakdown({
					protocol,
					protocolOracleData: oracleProtocols[protocol.name],
					chain: canonicalChain
				})

				nextFilteredProtocols.push({
					...protocol,
					tvl: breakdown.tvl,
					extraTvl: breakdown.extraTvl
				})
			}

			filteredProtocols = nextFilteredProtocols.toSorted((a, b) => b.tvl - a.tvl)
		}

		const chainChartData =
			canonicalChain && oracleChainBreakdown ? toSingleChainChartData(canonicalChain, oracleChainBreakdown) : null

		const latestChartData = chartData[chartData.length - 1]?.[1] ?? {}
		const oraclesUnique = canonicalOracle
			? [canonicalOracle]
			: Object.entries(latestChartData)
					.toSorted(([, a], [, b]) => (b.tvl ?? 0) - (a.tvl ?? 0))
					.map(([name]) => name)

		const tokensProtocols = buildTokensProtocols(oraclesTVS)

		let oracleLinks: Array<{ label: string; to: string }>
		if (canonicalOracle) {
			const latestOracleTvlByChain = getLatestTvlByChain(oracleChainBreakdown)
			const oracleChains = (chainsByOracle[canonicalOracle] ?? []).toSorted(
				(a, b) => (latestOracleTvlByChain[b] ?? 0) - (latestOracleTvlByChain[a] ?? 0)
			)

			oracleLinks = [{ label: 'All', to: `/oracles/${slug(canonicalOracle)}` }].concat(
				oracleChains.map((c) => ({ label: c, to: `/oracles/${slug(canonicalOracle)}/${slug(c)}` }))
			)
		} else {
			const latestGlobalTvlByChain = getLatestTvlByChain(chainBreakdown)
			const uniqueChains = getAllChains(chainsByOracle).toSorted(
				(a, b) => (latestGlobalTvlByChain[b] ?? 0) - (latestGlobalTvlByChain[a] ?? 0)
			)
			oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
				uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${slug(c)}` }))
			)
		}

		return {
			chain: canonicalChain ?? null,
			chainChartData,
			chainsByOracle,
			protocolsTableData,
			tokens: oraclesUnique,
			tokenLinks: oracleLinks,
			token: canonicalOracle,
			tokensProtocols,
			filteredProtocols,
			chartData,
			oraclesColors: buildColors(oraclesUnique)
		}
	} catch (e) {
		console.log(e)
		return null
	}
}

export async function getOraclesPagePaths(): Promise<Array<{ params: { oracle: string } }>> {
	const metrics = await fetchOracleMetrics()
	const paths: Array<{ params: { oracle: string } }> = []
	let i = 0
	for (const oracle in metrics.oracles) {
		if (i >= 10) break
		paths.push({ params: { oracle: slug(oracle) } })
		i++
	}
	return paths
}

export async function getOraclePageDataByChain(chain: string): Promise<IOracleChainPageData | INotFoundResponse | null> {
	try {
		const [metrics, { protocols }]: [Awaited<ReturnType<typeof fetchOracleMetrics>>, TProtocolsApiResponse] = await Promise.all([
			fetchOracleMetrics(),
			fetchJson(PROTOCOLS_API)
		])

		const chainsByOracle = metrics.chainsByOracle ?? {}
		const allChains = getAllChains(chainsByOracle)
		const canonicalChain = resolveCanonicalName(chain, allChains)

		if (!canonicalChain) {
			return { notFound: true }
		}

		const [protocolBreakdownByChain, chainBreakdown] = await Promise.all([
			fetchOracleChainProtocolBreakdownChart({ chain: canonicalChain }),
			fetchOracleChainBreakdownChart()
		])

		const chartData = toOracleBreakdownChartData(protocolBreakdownByChain)

		const latestChartData = chartData[chartData.length - 1]?.[1] ?? {}
		const sortedOracles = Object.entries(latestChartData).toSorted(([, a], [, b]) => (b.tvl ?? 0) - (a.tvl ?? 0))
		const oraclesUnique: Array<string> = []
		for (const [oracleName] of sortedOracles) {
			if (chainsByOracle[oracleName]?.includes(canonicalChain)) {
				oraclesUnique.push(oracleName)
			}
		}

		const tokensProtocols = buildTokensProtocolsByChain({
			protocols,
			chain: canonicalChain,
			oracles: Object.keys(chainsByOracle)
		})

		const latestTvlByChain = getLatestTvlByChain(chainBreakdown)
		const uniqueChains = getAllChains(chainsByOracle).toSorted(
			(a, b) => (latestTvlByChain[b] ?? 0) - (latestTvlByChain[a] ?? 0)
		)
		const oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
			uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${slug(c)}` }))
		)

		return {
			chain: canonicalChain,
			chainsByOracle,
			tokens: oraclesUnique,
			tokenLinks: oracleLinks,
			tokensProtocols,
			chartData,
			oraclesColors: buildColors(oraclesUnique)
		}
	} catch (e) {
		console.log(e)
		return null
	}
}
