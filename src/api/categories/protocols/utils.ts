import { keepNeededProperties } from '~/api/shared'
import type { IFormattedProtocol } from '~/api/types'
import type { ILiteProtocol } from '~/containers/ChainOverview/types'
import { TVL_SETTINGS_KEYS_SET } from '~/contexts/LocalStorage'
import { formatNum, getPercentChange } from '~/utils'

export type BasicPropsToKeep = (keyof IFormattedProtocol)[]

interface IFormatProtocolsData {
	chain?: string
	oracle?: string
	fork?: string
	category?: string
	protocols: Array<ILiteProtocol>
	protocolProps?: BasicPropsToKeep
	removeBridges?: boolean
}

export const basicPropertiesToKeep: BasicPropsToKeep = [
	'tvl',
	'name',
	'symbol',
	'chains',
	'chainTvls',
	'logo',
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
			// Convert to Set for O(1) lookup instead of O(n) .includes()
			const chainSet = protocol.chains ? new Set(protocol.chains) : new Set<string>()
			toFilter = toFilter && chainSet.has(chain)
		}

		if (oracle) {
			// Convert to Set for O(1) lookup instead of O(n) .includes()
			let oracleSet: Set<string> | undefined
			if (protocol.oraclesByChain) {
				oracleSet = new Set(
					chain ? protocol.oraclesByChain[chain] || [] : Object.values(protocol.oraclesByChain).flat()
				)
			} else if (protocol.oracles) {
				oracleSet = new Set(protocol.oracles)
			}
			toFilter = toFilter && (oracleSet?.has(oracle) ?? false)
		}

		if (fork) {
			// Convert to Set for O(1) lookup instead of O(n) .includes()
			const forkSet = protocol.forkedFrom ? new Set(protocol.forkedFrom) : new Set<string>()
			toFilter = toFilter && forkSet.has(fork)
		}

		if (category) {
			toFilter = toFilter && category.toLowerCase() === (protocol.category?.toLowerCase() ?? '')
		}

		if (toFilter) {
			if (protocol.deprecated) {
				final = [
					...final,
					{ name: protocol.name, chains: protocol.chains, extraTvl: {}, category: protocol.category, deprecated: true }
				]
				return final
			}

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
						// O(1) Set lookup instead of O(n) .includes()
						const oracleSet = new Set(protocol.oraclesByChain[ochain])
						if (oracleSet.has(oracle)) {
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
					const sectionParts = sectionName.split('-')
					const chainKey = sectionParts[0]
					// O(1) Set lookup instead of O(n) .includes()
					const chainOracleSet = protocol.oraclesByChain[chainKey]
						? new Set(protocol.oraclesByChain[chainKey])
						: new Set<string>()
					if (sectionParts.length > 1 && chainOracleSet.has(oracle)) {
						const prop = sectionParts[1]
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

					const filteredChains: string[] = []
					for (const chain in protocol.oraclesByChain) {
						// O(1) Set lookup instead of O(n) .includes()
						const oSet = new Set(protocol.oraclesByChain[chain])
						if (oSet.has(oracle)) {
							filteredChains.push(chain)
						}
					}
					p.chains = filteredChains
				} else {
					if (TVL_SETTINGS_KEYS_SET.has(sectionName) || sectionName === 'excludeParent') {
						p.extraTvl[sectionName] = protocol.chainTvls[sectionName]
					}
				}
			}

			p.change_1d = getPercentChange(p.tvl, p.tvlPrevDay)
			p.change_7d = getPercentChange(p.tvl, p.tvlPrevWeek)
			p.change_1m = getPercentChange(p.tvl, p.tvlPrevMonth)
			p.mcaptvl = protocol.mcap && p.tvl ? +(formatNum(protocol.mcap / (p.tvl as number)) ?? 0) : null

			final = [...final, p]
		}

		return final
	}, [])

	return data.sort((a, b) => b.tvl - a.tvl)
}
