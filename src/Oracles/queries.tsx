import { formatProtocolsData } from '~/api/categories/protocols/utils'
import { ILiteParentProtocol, ILiteProtocol } from '~/ChainOverview/types'
import { ORACLE_API, PROTOCOLS_API } from '~/constants'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'
import { getAdapterOverview, IAdapterOverview } from '~/DimensionAdapters/queries'
import { getColorFromNumber, slug } from '~/utils'
import { fetchWithErrorLogging } from '~/utils/async'

interface IOracleProtocols {
	[key: string]: number
}

interface IOracleApiResponse {
	chart: Record<string, Record<string, Record<string, number>>>
	chainChart: Record<string, Record<string, Record<string, number>>>
	oracles: Record<string, Array<string>>
	chainsByOracle: Record<string, Array<string>>
}

// - used in /oracles and /oracles/[name]
export async function getOraclePageData(oracle = null, chain = null) {
	try {
		const [{ chart = {}, chainChart = {}, oracles = {}, chainsByOracle }, { protocols }, perps]: [
			IOracleApiResponse,
			{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
			IAdapterOverview | null
		] = await Promise.all([
			fetchWithErrorLogging(ORACLE_API).then((r) => r.json()),
			fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json()),
			getAdapterOverview({
				type: 'derivatives',
				chain: 'All',
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}).catch((err) => {
				console.log(err)
				return null
			})
		])

		const oracleExists = oracle ? oracles[oracle] && (chain ? chainsByOracle[oracle].includes(chain) : true) : true

		if (!oracleExists) {
			return {
				notFound: true
			}
		}

		const filteredProtocols = formatProtocolsData({ oracle, protocols, chain })

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

		const oracleMonthlyVolumes =
			perps?.protocols?.reduce((acc, protocol) => {
				const p = protocols.find((p) => p.name === protocol.name)

				if (!p) return acc

				if (p.oraclesByChain) {
					for (const ch in p.oraclesByChain) {
						if (chain ? chain === ch : true) {
							for (const oracle of p.oraclesByChain[ch]) {
								acc[oracle] = (acc[oracle] ?? 0) + (protocol.breakdown30d?.[slug(ch)]?.[protocol.name] ?? 0)
							}
						}
					}
				} else {
					for (const oracle of p.oracles ?? []) {
						acc[oracle] = (acc[oracle] ?? 0) + (protocol.total30d ?? 0)
					}
				}

				return acc
			}, {}) ?? {}

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

		for (const orc in oracles) {
			oraclesProtocols[orc] = oracles[orc]?.length
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
			filteredProtocols,
			chartData,
			oraclesColors: colors,
			oracleMonthlyVolumes,
			derivativeProtocols: perps?.protocols ?? []
		}
	} catch (e) {
		console.log(e)
		return null
	}
}

export async function getOraclePageDataByChain(chain: string) {
	try {
		const [
			{ chart = {}, chainChart = {}, oracles = {}, chainsByOracle },
			{ protocols },
			{ protocols: derivativeProtocols }
		]: [
			IOracleApiResponse,
			{ protocols: Array<ILiteProtocol>; chains: Array<string>; parentProtocols: Array<ILiteParentProtocol> },
			IAdapterOverview | null
		] = await Promise.all([
			fetchWithErrorLogging(ORACLE_API).then((r) => r.json()),
			fetchWithErrorLogging(PROTOCOLS_API).then((r) => r.json()),
			getAdapterOverview({
				type: 'derivatives',
				chain: 'All',
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true
			}).catch((err) => {
				console.log(err)
				return null
			})
		])

		const filteredProtocols = formatProtocolsData({ protocols, chain })

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

		const oracleMonthlyVolumes = derivativeProtocols.reduce((acc, protocol) => {
			const p = protocols.find((p) => p.name === protocol.name)

			if (!p) return acc

			if (p.oraclesByChain) {
				for (const ch in p.oraclesByChain) {
					if (chain ? chain === ch : true) {
						for (const oracle of p.oraclesByChain[ch]) {
							acc[oracle] = (acc[oracle] ?? 0) + (protocol.breakdown30d?.[slug(chain)]?.[protocol.name] ?? 0)
						}
					}
				}
			} else {
				for (const oracle of p.oracles ?? []) {
					acc[oracle] = (acc[oracle] ?? 0) + (protocol.breakdown30d?.[slug(chain)]?.[protocol.name] ?? 0)
				}
			}

			return acc
		}, {})

		const oraclesProtocols: IOracleProtocols = {}

		for (const orc in oracles) {
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
			filteredProtocols,
			chartData: chainChartData,
			oraclesColors: colors,
			oracleMonthlyVolumes
		}
	} catch (e) {
		console.log(e)
		return null
	}
}
