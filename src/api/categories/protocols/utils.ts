import type { IFormattedProtocol, LiteProtocol } from '~/api/types'
import { keepNeededProperties } from '~/api/shared'
import { getPercentChange } from '~/utils'
import { DEFI_SETTINGS_KEYS } from '~/contexts/LocalStorage'

export type BasicPropsToKeep = (keyof IFormattedProtocol)[]

interface IFormatProtocolsData {
	chain?: string
	oracle?: string
	fork?: string
	category?: string
	protocols: LiteProtocol[]
	protocolProps?: BasicPropsToKeep
	removeBridges?: boolean
}

export const basicPropertiesToKeep: BasicPropsToKeep = [
	'tvl',
	'name',
	'symbol',
	'chains',
	'tvlPrevDay',
	'tvlPrevWeek',
	'tvlPrevMonth',
	'change_1d',
	'change_7d',
	'change_1m',
	'mcap',
	'mcaptvl',
	'category',
	'parentProtocol',
	'defillamaId'
]

export const formatProtocolsData = ({
	chain,
	oracle,
	fork,
	category,
	protocols = [],
	protocolProps = [...basicPropertiesToKeep, 'extraTvl'],
	removeBridges = false
}: IFormatProtocolsData) => {
	const data = protocols.reduce((final, protocol) => {
		let toFilter = true

		if (removeBridges) {
			toFilter = toFilter && protocol?.category !== 'Bridge'
		}

		if (chain) {
			toFilter = toFilter && protocol.chains?.includes(chain)
		}

		if (oracle) {
			if (protocol.oraclesByChain) {
				toFilter = toFilter && (chain ? protocol.oraclesByChain[chain]?.includes(oracle) : true)
			} else {
				toFilter = toFilter && protocol.oracles?.includes(oracle)
			}
		}

		if (fork) {
			toFilter = toFilter && protocol.forkedFrom?.includes(fork)
		}

		if (category) {
			toFilter = toFilter && category.toLowerCase() === (protocol.category?.toLowerCase() ?? '')
		}

		if (toFilter) {
			const p = keepNeededProperties(protocol, protocolProps)

			if (chain) {
				p.tvl = protocol.chainTvls[chain]?.tvl ?? 0
				p.tvlPrevDay = protocol.chainTvls[chain]?.tvlPrevDay ?? null
				p.tvlPrevWeek = protocol.chainTvls[chain]?.tvlPrevWeek ?? null
				p.tvlPrevMonth = protocol.chainTvls[chain]?.tvlPrevMonth ?? null
			} else {
				if (oracle && protocol.oraclesByChain) {
					p.tvl = 0
					p.tvlPrevDay = 0
					p.tvlPrevWeek = 0
					p.tvlPrevMonth = 0

					for (const ochain in protocol.oraclesByChain) {
						if (protocol.oraclesByChain[ochain].includes(oracle)) {
							p.tvl += protocol.chainTvls[ochain]?.tvl ?? 0
							p.tvlPrevDay += protocol.chainTvls[ochain]?.tvlPrevDay ?? 0
							p.tvlPrevWeek += protocol.chainTvls[ochain]?.tvlPrevWeek ?? 0
							p.tvlPrevMonth += protocol.chainTvls[ochain]?.tvlPrevMonth ?? 0
						}
					}
				}
			}

			p.extraTvl = {}

			for (const sectionName in protocol.chainTvls) {
				if (chain) {
					if (sectionName.startsWith(`${chain}-`)) {
						p.extraTvl[sectionName.split('-')[1]] = protocol.chainTvls[sectionName]
					}
				} else if (oracle && protocol.oraclesByChain) {
					if (sectionName.includes('-') && protocol.oraclesByChain[sectionName.split('-')[0]]?.includes(oracle)) {
						const prop = sectionName.split('-')[1]
						if (!p.extraTvl[prop]) {
							p.extraTvl[prop] = {
								tvl: 0,
								tvlPrevDay: 0,
								tvlPrevWeek: 0,
								tvlPrevMonth: 0
							}
						}
						p.extraTvl[prop].tvl += protocol.chainTvls[sectionName].tvl
						p.extraTvl[prop].tvlPrevDay += protocol.chainTvls[sectionName].tvlPrevDay
						p.extraTvl[prop].tvlPrevWeek += protocol.chainTvls[sectionName].tvlPrevWeek
						p.extraTvl[prop].tvlPrevMonth += protocol.chainTvls[sectionName].tvlPrevMonth
					}

					p.chains = Object.keys(protocol.oraclesByChain).filter((chain) =>
						protocol.oraclesByChain[chain].includes(oracle)
					)
				} else {
					if (DEFI_SETTINGS_KEYS.includes(sectionName)) {
						p.extraTvl[sectionName] = protocol.chainTvls[sectionName]
					}
				}
			}

			p.change_1d = getPercentChange(p.tvl, p.tvlPrevDay)
			p.change_7d = getPercentChange(p.tvl, p.tvlPrevWeek)
			p.change_1m = getPercentChange(p.tvl, p.tvlPrevMonth)
			p.mcaptvl = protocol.mcap && p.tvl ? +(protocol.mcap / p.tvl).toFixed(2) : null

			final = [...final, p]
		}

		return final
	}, [])

	return data.sort((a, b) => b.tvl - a.tvl)
}
