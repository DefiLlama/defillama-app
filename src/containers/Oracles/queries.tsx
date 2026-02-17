import { PROTOCOLS_API } from '~/constants'
import type { ILiteParentProtocol, ILiteProtocol } from '~/containers/ChainOverview/types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { toStrikeTvl } from '~/containers/ChainOverview/utils'
import { getNDistinctColors, slug } from '~/utils'
import { fetchJson } from '~/utils/async'
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
	OracleOverviewChartData,
	OracleProtocolWithBreakdown,
	OracleTableDataRow
} from './types'

type TProtocolsApiResponse = {
	protocols: Array<ILiteProtocol>
	chains: Array<string>
	parentProtocols: Array<ILiteParentProtocol>
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

function buildOracleProtocolBreakdown({
	protocolOracleData,
	chain
}: {
	protocolOracleData: Record<string, number> | undefined
	chain: string | null
}): { tvl: number; extraTvl: Record<string, { tvl: number }> } {
	let tvl = 0
	const extraTvl: Record<string, { tvl: number }> = {}

	if (!protocolOracleData) {
		return { tvl, extraTvl }
	}

	for (const [breakdownKey, value] of Object.entries(protocolOracleData)) {
		if (chain) {
			if (breakdownKey === chain) {
				tvl += value
				continue
			}

			if (!breakdownKey.includes('-')) continue
			const [chainName, ...metricNameParts] = breakdownKey.split('-')
			if (chainName !== chain || metricNameParts.length === 0) continue

			const metricName = metricNameParts.join('-')
			const currentValue = extraTvl[metricName]?.tvl ?? 0
			extraTvl[metricName] = { tvl: currentValue + value }
			continue
		}

		if (TVL_SETTINGS_KEYS_SET.has(breakdownKey)) {
			const currentValue = extraTvl[breakdownKey]?.tvl ?? 0
			extraTvl[breakdownKey] = { tvl: currentValue + value }
		} else {
			tvl += value
		}
	}

	return { tvl, extraTvl }
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
		? toOracleTvlBreakdownChartData(await fetchOracleChainProtocolBreakdownChart({ chain: canonicalChain }))
		: toOracleTvlBreakdownChartData(await fetchOracleProtocolBreakdownChart())
	const latestTvlByChain: Record<string, number> = {}

	const tableData: Array<OracleTableDataRow> = []
	for (const oracle in oraclesTVS) {
		const chains = chainsByOracle[oracle] ?? []
		if (canonicalChain && !chains.includes(canonicalChain)) {
			continue
		}

		let tvl = 0
		const extraTvl: Record<string, number> = {}
		let protocolsSecured = 0
		for (const protocolName in oraclesTVS[oracle]) {
			for (const chainOrExtraTvlKey in oraclesTVS[oracle][protocolName]) {
				const value = oraclesTVS[oracle][protocolName][chainOrExtraTvlKey]
				if (!chainOrExtraTvlKey.includes('-') && !TVL_SETTINGS_KEYS_SET.has(chainOrExtraTvlKey)) {
					latestTvlByChain[chainOrExtraTvlKey] = (latestTvlByChain[chainOrExtraTvlKey] ?? 0) + value
				}

				if (canonicalChain) {
					if (canonicalChain === chainOrExtraTvlKey) {
						tvl += value
					}

					if (chainOrExtraTvlKey.includes('-')) {
						const [chainName, ...metricNameParts] = chainOrExtraTvlKey.split('-')
						if (chainName === canonicalChain && metricNameParts.length > 0) {
							const metricName = metricNameParts.join('-')
							extraTvl[metricName] = (extraTvl[metricName] ?? 0) + value
						}
					}
				} else {
					if (TVL_SETTINGS_KEYS_SET.has(chainOrExtraTvlKey)) {
						extraTvl[chainOrExtraTvlKey] = (extraTvl[chainOrExtraTvlKey] ?? 0) + value
					} else {
						tvl += value
					}
				}
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

	const uniqueChains = getAllChains(chainsByOracle).toSorted(
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

	let chartData: OracleOverviewChartData = []
	let protocols: Array<ILiteProtocol> = []

	if (canonicalChain) {
		const [fetchedOracleChainBreakdown, { protocols: fetchedProtocols }] = await Promise.all([
			fetchOracleProtocolChainBreakdownChart({ protocol: canonicalOracle }),
			fetchJson<TProtocolsApiResponse>(PROTOCOLS_API)
		])
		protocols = fetchedProtocols
		chartData = fetchedOracleChainBreakdown.reduce<OracleOverviewChartData>((acc, dayData) => {
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
			fetchJson<TProtocolsApiResponse>(PROTOCOLS_API)
		])
		protocols = fetchedProtocols
		chartData = toSingleOracleChartData(canonicalOracle, oracleChart ?? [])
	}

	const oracleProtocols = oraclesTVS[canonicalOracle] ?? {}
	let tvl = 0
	const extraTvl: Record<string, number> = {}
	for (const protocolName in oracleProtocols) {
		for (const chainOrExtraTvlKey in oracleProtocols[protocolName]) {
			const value = oracleProtocols[protocolName][chainOrExtraTvlKey]
			if (canonicalChain) {
				if (canonicalChain === chainOrExtraTvlKey) {
					tvl += value
				}

				if (chainOrExtraTvlKey.includes('-')) {
					const [chainName, ...metricNameParts] = chainOrExtraTvlKey.split('-')
					if (chainName === canonicalChain && metricNameParts.length > 0) {
						const metricName = metricNameParts.join('-')
						extraTvl[metricName] = (extraTvl[metricName] ?? 0) + value
					}
				}
			} else {
				if (TVL_SETTINGS_KEYS_SET.has(chainOrExtraTvlKey)) {
					extraTvl[chainOrExtraTvlKey] = (extraTvl[chainOrExtraTvlKey] ?? 0) + value
				} else {
					tvl += value
				}
			}
		}
	}

	const protocolsByName = new Map(protocols.map((protocol) => [protocol.name, protocol]))
	const protocolsSupportingCanonicalChain = canonicalChain
		? new Set(protocols.filter((protocol) => protocol.chains.includes(canonicalChain)).map((protocol) => protocol.name))
		: null
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
				liquidstaking: !!protocolExtraTvl.liquidstaking,
				doublecounted: !!protocolExtraTvl.doublecounted
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
