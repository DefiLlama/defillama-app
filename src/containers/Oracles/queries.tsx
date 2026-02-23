import { toStrikeTvl } from '~/containers/ChainOverview/utils'
import { fetchProtocols } from '~/containers/Protocols/api'
import type { ProtocolLite } from '~/containers/Protocols/api.types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { getNDistinctColors, slug } from '~/utils'
import {
	fetchOracleMetrics,
	fetchOracleProtocolBreakdownChart,
	fetchOracleProtocolChart,
	fetchOracleProtocolChainBreakdownChart,
	fetchOracleChainProtocolBreakdownChart
} from './api'
import type {
	OracleBreakdownItem,
	OracleChartData,
	OracleOverviewPageData,
	OraclesByChainPageData,
	OracleProtocolWithBreakdown,
	OracleTableDataRow
} from './types'

function isExtraTvlKey(value: string): boolean {
	return TVL_SETTINGS_KEYS_SET.has(value) || value === 'dcAndLsOverlap'
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

function buildMultiOracleChartDataFromBreakdown(
	protocolBreakdown: ReadonlyArray<OracleBreakdownItem>
): OracleChartData {
	return protocolBreakdown.map((dayData) => ({ ...dayData }))
}

function aggregateTvlFromBreakdown({
	data,
	chain
}: {
	data: Record<string, number> | undefined
	chain: string | null
}): { tvl: number; extraTvl: Record<string, number> } {
	let tvl = 0
	const extraTvl: Record<string, number> = {}

	if (!data) {
		return { tvl, extraTvl }
	}

	for (const [breakdownKey, value] of Object.entries(data)) {
		if (isExtraTvlKey(breakdownKey)) {
			continue
		}

		if (chain) {
			if (breakdownKey === chain) {
				tvl += value
				continue
			}

			const metricPrefix = `${chain}-`
			if (!breakdownKey.startsWith(metricPrefix)) continue
			const metricName = breakdownKey.slice(metricPrefix.length)
			if (!metricName || !isExtraTvlKey(metricName)) continue
			extraTvl[metricName] = (extraTvl[metricName] ?? 0) + value
			continue
		}

		if (!breakdownKey.includes('-')) {
			tvl += value
		} else {
			const separatorIndex = breakdownKey.indexOf('-')
			const metricName = breakdownKey.slice(separatorIndex + 1)
			if (!metricName || !isExtraTvlKey(metricName)) continue
			extraTvl[metricName] = (extraTvl[metricName] ?? 0) + value
		}
	}

	return { tvl, extraTvl }
}

function buildOracleProtocolBreakdown({
	protocolOracleData,
	chain
}: {
	protocolOracleData: Record<string, number> | undefined
	chain: string | null
}): { tvl: number; extraTvl: Record<string, number> } {
	return aggregateTvlFromBreakdown({
		data: protocolOracleData,
		chain
	})
}

// - /oracles, /oracles/chain/:chain
export async function getOraclesListPageData({
	chain = null
}: {
	chain?: string | null
} = {}): Promise<OraclesByChainPageData | null> {
	const metrics = await fetchOracleMetrics()

	const chainsByOracle = metrics.chainsByOracle ?? {}
	const oraclesTVS = metrics.oraclesTVS ?? {}
	const allChains = getAllChains(chainsByOracle)
	const canonicalChain = chain ? resolveCanonicalName(chain, allChains) : null

	if (chain && !canonicalChain) {
		return null
	}

	const chartData = canonicalChain
		? buildMultiOracleChartDataFromBreakdown(await fetchOracleChainProtocolBreakdownChart({ chain: canonicalChain }))
		: buildMultiOracleChartDataFromBreakdown(await fetchOracleProtocolBreakdownChart())
	const latestTvlByChain: Record<string, number> = {}

	const tableData: Array<OracleTableDataRow> = []
	for (const oracle in oraclesTVS) {
		const chains = chainsByOracle[oracle] ?? []
		// Single lookup: .includes() is more efficient than creating a Set
		if (canonicalChain && !chains.includes(canonicalChain)) {
			continue
		}

		let tvl = 0
		const extraTvl: Record<string, number> = {}
		let protocolsSecured = 0
		for (const protocolName in oraclesTVS[oracle]) {
			const protocolBreakdown = oraclesTVS[oracle][protocolName]
			const { tvl: protocolTvl, extraTvl: protocolExtraTvl } = aggregateTvlFromBreakdown({
				data: protocolBreakdown,
				chain: canonicalChain
			})
			tvl += protocolTvl
			for (const [extraKey, extraValue] of Object.entries(protocolExtraTvl)) {
				extraTvl[extraKey] = (extraTvl[extraKey] ?? 0) + extraValue
			}

			for (const chainOrExtraTvlKey in protocolBreakdown) {
				const value = protocolBreakdown[chainOrExtraTvlKey]
				if (chainOrExtraTvlKey.includes('-') || isExtraTvlKey(chainOrExtraTvlKey)) continue
				latestTvlByChain[chainOrExtraTvlKey] = (latestTvlByChain[chainOrExtraTvlKey] ?? 0) + value
			}
			protocolsSecured += 1
		}
		tableData.push({
			name: oracle,
			tvl,
			extraTvl,
			protocolsSecured,
			chains
		})
	}
	tableData.sort((a, b) => b.tvl - a.tvl)

	const oracles = tableData.map((row) => row.name)
	const oraclesColors: Record<string, string> = {
		Others: '#AAAAAA'
	}
	const sortedColors = getNDistinctColors(oracles.length)
	for (let i = 0; i < oracles.length; i++) {
		oraclesColors[oracles[i]] = sortedColors[i]
	}

	const uniqueChains = [...getAllChains(chainsByOracle)].sort(
		(a, b) => (latestTvlByChain[b] ?? 0) - (latestTvlByChain[a] ?? 0)
	)
	const chainLinks = [{ label: 'All', to: `/oracles` }].concat(
		uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${slug(c)}` }))
	)

	return {
		chain: canonicalChain,
		oracles,
		chainLinks,
		tableData,
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
}): Promise<OracleOverviewPageData | null> {
	const metrics = await fetchOracleMetrics()
	const oracleProtocolNamesByOracle = metrics.oracles ?? {}
	const chainsByOracle = metrics.chainsByOracle ?? {}
	const oraclesTVS = metrics.oraclesTVS ?? {}

	const oracleNames: string[] = []
	for (const oracleName in oraclesTVS) {
		oracleNames.push(oracleName)
	}
	const canonicalOracle = resolveCanonicalName(oracle, oracleNames)
	if (!canonicalOracle) {
		return null
	}

	const availableChains = chainsByOracle[canonicalOracle] ?? []
	const canonicalChain = chain ? resolveCanonicalName(chain, availableChains) : null
	if (chain && !canonicalChain) {
		return null
	}

	let chartData: OracleChartData = []
	let protocols: Array<ProtocolLite> = []

	if (canonicalChain) {
		const [fetchedOracleChainBreakdown, { protocols: fetchedProtocols }] = await Promise.all([
			fetchOracleProtocolChainBreakdownChart({ protocol: canonicalOracle }),
			fetchProtocols()
		])
		protocols = fetchedProtocols
		chartData = fetchedOracleChainBreakdown.reduce<OracleChartData>((acc, dayData) => {
			const chainValue = dayData[canonicalChain]
			if (typeof chainValue !== 'number') return acc
			acc.push({
				timestamp: dayData.timestamp,
				[canonicalOracle]: chainValue
			})
			return acc
		}, [])
	} else {
		const [oracleChart, { protocols: fetchedProtocols }] = await Promise.all([
			fetchOracleProtocolChart({ protocol: canonicalOracle }),
			fetchProtocols()
		])
		protocols = fetchedProtocols
		chartData =
			oracleChart?.map(([timestamp, value]) => ({
				timestamp,
				[canonicalOracle]: value
			})) ?? []
	}

	const oracleProtocols = oraclesTVS[canonicalOracle] ?? {}
	let tvl = 0
	const extraTvl: Record<string, number> = {}
	for (const protocolName in oracleProtocols) {
		const { tvl: protocolTvl, extraTvl: protocolExtraTvl } = aggregateTvlFromBreakdown({
			data: oracleProtocols[protocolName],
			chain: canonicalChain
		})
		tvl += protocolTvl
		for (const [extraKey, extraValue] of Object.entries(protocolExtraTvl)) {
			extraTvl[extraKey] = (extraTvl[extraKey] ?? 0) + extraValue
		}
	}

	const protocolsByName = new Map(protocols.map((protocol) => [protocol.name, protocol]))
	// Build one Set for repeated membership checks in the table loop.
	// The per-protocol chain test remains a single cheap `.includes()` call.
	let protocolsSupportingCanonicalChain: Set<string> | null = null
	if (canonicalChain) {
		protocolsSupportingCanonicalChain = new Set<string>()
		for (const protocol of protocols) {
			if (protocol.chains.includes(canonicalChain)) {
				protocolsSupportingCanonicalChain.add(protocol.name)
			}
		}
	}
	const orderedOracleProtocolNames = oracleProtocolNamesByOracle[canonicalOracle] ?? []
	const protocolTableData: Array<OracleProtocolWithBreakdown> = []
	for (const protocolName of orderedOracleProtocolNames) {
		const protocolData = protocolsByName.get(protocolName)
		if (!protocolData) continue
		if (protocolsSupportingCanonicalChain && !protocolsSupportingCanonicalChain.has(protocolName)) continue

		const { tvl: protocolTvl, extraTvl: protocolExtraTvl } = buildOracleProtocolBreakdown({
			protocolOracleData: oracleProtocols[protocolName],
			chain: canonicalChain
		})

		protocolTableData.push({
			...protocolData,
			tvl: protocolTvl,
			extraTvl: protocolExtraTvl,
			strikeTvl: toStrikeTvl(protocolData, {
				liquidstaking: protocolExtraTvl.liquidstaking !== undefined,
				doublecounted: protocolExtraTvl.doublecounted !== undefined
			})
		})
	}

	const oracleChains = chainsByOracle[canonicalOracle] ?? []
	const chainLinks = [{ label: 'All', to: `/oracles/${slug(canonicalOracle)}` }].concat(
		oracleChains.map((c) => ({ label: c, to: `/oracles/${slug(canonicalOracle)}/${slug(c)}` }))
	)

	return {
		chain: canonicalChain ?? null,
		chainLinks,
		oracle: canonicalOracle,
		tvl,
		extraTvl,
		protocolTableData,
		chartData
	}
}
