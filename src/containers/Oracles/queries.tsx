import { formatProtocolsData } from '~/api/categories/protocols/utils'
import { ILiteParentProtocol, ILiteProtocol } from '~/containers/ChainOverview/types'
import { ORACLE_API, PROTOCOLS_API } from '~/constants'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getAdapterChainOverview, IAdapterOverview } from '~/containers/DimensionAdapters/queries'
import { getColorFromNumber, slug } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'

interface IOracleProtocols {
	[key: string]: number
}

interface IOracleApiResponse {
	chart: Record<string, Record<string, Record<string, number>>>
	chainChart: Record<string, Record<string, Record<string, number>>>
	oraclesTVS: Record<string, Record<string, number>>
	chainsByOracle: Record<string, Array<string>>
}

// - used in /oracles and /oracles/[name]
export async function getOraclePageData(oracle = null, chain = null) {
	try {
		const [{ chart = {}, chainChart = {}, oraclesTVS = {}, chainsByOracle }, { protocols }, perps]: [
			IOracleApiResponse,
			{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
			IAdapterOverview | null
		] = await Promise.all([
			fetchWithErrorLogging(ORACLE_API).then((r) => r.json()),
			fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json()),
			getAdapterChainOverview({
				adapterType: 'derivatives',
				chain: 'All',
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}).catch((err) => {
				console.log(err)
				return null
			})
		])

		const oracleExists = oracle ? oraclesTVS[oracle] && (chain ? chainsByOracle[oracle].includes(chain) : true) : true

		if (!oracleExists) {
			return {
				notFound: true
			}
		}

		const oracleFilteredProtocols =
			oracle && oraclesTVS[oracle] ? protocols.filter((protocol) => protocol.name in oraclesTVS[oracle]) : protocols

		const filteredProtocols = formatProtocolsData({ oracle, protocols: oracleFilteredProtocols, chain })
		const protocolsWithTvs = filteredProtocols.map((protocol) => {
			let tvs = null
			const oraclesToCheck = oracle ? [oracle] : Object.keys(oraclesTVS)
			for (const oracleKey of oraclesToCheck) {
				const oracleData = oraclesTVS[oracleKey]
				if (oracleData && oracleData[protocol.name]) {
					tvs = oracleData[protocol.name]
					break
				}
			}
			return {
				...protocol,
				tvs
			}
		})

		let chartData = Object.entries(chart)
		const chainChartData = chain
			? Object.entries(chainChart)
					.map(([date, data]) => {
						const chainName = chain
						const chainData = Object.entries(data[oracle] || {})
							.map(([name, value]) =>
								name.includes(chainName) ? [name.replace(chainName, '').replace('-', '') || 'tvl', value] : null
							)
							.filter(Boolean)
						return Object.values(chainData).length ? [date, Object.fromEntries(chainData)] : null
					})
					.filter(Boolean)
			: null

		const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((orc) => orc[0])

		if (oracle) {
			let data = []
			chartData.forEach(([date, tokens]) => {
				const value = tokens[oracle]
				if (value) {
					data.push([date, value])
				}
			})
			chartData = data
		}

		const oraclesProtocols: IOracleProtocols = {}

		for (const orc in oraclesTVS) {
			oraclesProtocols[orc] = Object.keys(oraclesTVS[orc] || {}).length
		}

		const latestOracleTvlByChain = Object.entries(chainChart)[Object.entries(chainChart).length - 1][1] as Record<
			string,
			Record<string, number>
		>

		const latestTvlByChain: Record<string, number> = {}
		for (const oracle in latestOracleTvlByChain) {
			for (const ochain in latestOracleTvlByChain[oracle]) {
				if (!ochain.includes('-') && !DEFI_SETTINGS_KEYS.includes(ochain)) {
					latestTvlByChain[ochain] = (latestTvlByChain[ochain] ?? 0) + latestOracleTvlByChain[oracle][ochain]
				}
			}
		}

		const uniqueChains = (Array.from(new Set(Object.values(chainsByOracle).flat())) as Array<string>).sort(
			(a, b) => (latestTvlByChain[b] ?? 0) - (latestTvlByChain[a] ?? 0)
		)

		let oracleLinks = oracle
			? [{ label: 'All', to: `/oracles/${oracle}` }].concat(
					chainsByOracle[oracle].map((c: string) => ({ label: c, to: `/oracles/${oracle}/${c}` }))
			  )
			: [{ label: 'All', to: `/oracles` }].concat(uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${c}` })))

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			chain: chain ?? null,
			chainChartData,
			chainsByOracle,
			tokens: oraclesUnique,
			tokenLinks: oracleLinks,
			token: oracle,
			tokensProtocols: oraclesProtocols,
			filteredProtocols: protocolsWithTvs,
			chartData,
			oraclesColors: colors,
			derivativeProtocols: perps?.protocols ?? []
		}
	} catch (e) {
		console.log(e)
		return null
	}
}

export async function getOraclePageDataByChain(chain: string) {
	try {
		const [{ chart = {}, chainChart = {}, oraclesTVS = {}, chainsByOracle }, { protocols }]: [
			IOracleApiResponse,
			{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> }
		] = await Promise.all([
			fetchWithErrorLogging(ORACLE_API).then((r) => r.json()),
			fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json())
		])

		const filteredProtocols = formatProtocolsData({ protocols, chain })
		const protocolsWithTvs = filteredProtocols.map((protocol) => {
			let tvs = null
			for (const oracleKey of Object.keys(oraclesTVS)) {
				const oracleData = oraclesTVS[oracleKey]
				if (oracleData && oracleData[protocol.name]) {
					tvs = oracleData[protocol.name]
					break
				}
			}
			return {
				...protocol,
				tvs
			}
		})

		let chartData = Object.entries(chart)
		const chainChartData = chain
			? Object.entries(chainChart)
					.map(([date, data]) => {
						const chainName = chain
						const chainData = Object.entries(data)
							.map(([oracle, dayData]) => {
								const chainData = Object.entries(dayData)
									.map(([name, value]) =>
										name.includes(chainName) ? [name.replace(chainName, '').replace('-', '') || 'tvl', value] : null
									)
									.filter(Boolean)
								return Object.values(chainData).length ? [oracle, Object.fromEntries(chainData)] : null
							})
							.filter(Boolean)
						return Object.values(chainData).length ? [date, Object.fromEntries(chainData)] : null
					})
					.filter(Boolean)
			: null

		const oraclesUnique = Object.entries(chartData[chartData.length - 1][1])
			.sort((a, b) => b[1].tvl - a[1].tvl)
			.map((orc) => orc[0])
			.filter((orc) => chainsByOracle[orc]?.includes(chain))

		const oraclesProtocols: IOracleProtocols = {}

		for (const orc in oraclesTVS) {
			oraclesProtocols[orc] = protocols.filter((p) => p.oracles?.includes(orc) && p.chains.includes(chain)).length
		}

		const latestOracleTvlByChain = Object.entries(chainChart)[Object.entries(chainChart).length - 1][1] as Record<
			string,
			Record<string, number>
		>

		const latestTvlByChain: Record<string, number> = {}
		for (const oracle in latestOracleTvlByChain) {
			for (const ochain in latestOracleTvlByChain[oracle]) {
				if (!ochain.includes('-') && !DEFI_SETTINGS_KEYS.includes(ochain)) {
					latestTvlByChain[ochain] = (latestTvlByChain[ochain] ?? 0) + latestOracleTvlByChain[oracle][ochain]
				}
			}
		}

		const uniqueChains = (Array.from(new Set(Object.values(chainsByOracle).flat())) as Array<string>).sort(
			(a, b) => (latestTvlByChain[b] ?? 0) - (latestTvlByChain[a] ?? 0)
		)
		const oracleLinks = [{ label: 'All', to: `/oracles` }].concat(
			uniqueChains.map((c) => ({ label: c, to: `/oracles/chain/${c}` }))
		)

		const colors = {}

		oraclesUnique.forEach((chain, index) => {
			colors[chain] = getColorFromNumber(index, 6)
		})

		colors['Others'] = '#AAAAAA'

		return {
			chain: chain ?? null,
			chainChartData,
			chainsByOracle,
			tokens: oraclesUnique,
			tokenLinks: oracleLinks,
			tokensProtocols: oraclesProtocols,
			filteredProtocols: protocolsWithTvs,
			chartData: chainChartData,
			oraclesColors: colors
		}
	} catch (e) {
		console.log(e)
		return null
	}
}
