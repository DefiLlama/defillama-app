import type { IFormattedProtocol, LiteProtocol } from '~/api/types'
import { keepNeededProperties } from '~/api/shared'
import { getPercentChange } from '~/utils'

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
	const data: IFormattedProtocol[] = protocols
		.filter((protocol) => {
			let toFilter = true

			if (removeBridges) {
				toFilter = toFilter && protocol?.category !== 'Bridge'
			}

			if (chain) {
				toFilter = toFilter && protocol.chains?.includes(chain)
			}

			if (oracle) {
				if ((protocol as any).oraclesByChain) {
					protocol.tvl = 0
					protocol.tvlPrevDay = 0
					protocol.tvlPrevWeek = 0
					protocol.tvlPrevMonth = 0
					Object.entries((protocol as any).oraclesByChain).forEach(([ochain, oracles]: [any, any]) => {
						if (oracles.includes(oracle)) {
							const _tvl = protocol?.chainTvls[ochain]?.tvl ?? 0
							const _tvlPrevDay = protocol?.chainTvls[ochain]?.tvlPrevDay
							const _tvlPrevWeek = protocol?.chainTvls[ochain]?.tvlPrevWeek
							const _tvlPrevMonth = protocol?.chainTvls[ochain]?.tvlPrevMonth
							protocol.tvl += _tvl
							protocol.tvlPrevDay += _tvlPrevDay
							protocol.tvlPrevWeek += _tvlPrevWeek
							protocol.tvlPrevMonth += _tvlPrevMonth
						}
					})
					toFilter = toFilter && protocol.tvl !== 0
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

			return toFilter
		})
		.map((p) => {
			const protocol = keepNeededProperties(p, protocolProps)

			if (chain) {
				protocol.tvl = p.chainTvls[chain]?.tvl ?? 0
				protocol.tvlPrevDay = p.chainTvls[chain]?.tvlPrevDay ?? null
				protocol.tvlPrevWeek = p.chainTvls[chain]?.tvlPrevWeek ?? null
				protocol.tvlPrevMonth = p.chainTvls[chain]?.tvlPrevMonth ?? null
			}

			protocol.extraTvl = {}
			protocol.change_1d = getPercentChange(protocol.tvl, protocol.tvlPrevDay)
			protocol.change_7d = getPercentChange(protocol.tvl, protocol.tvlPrevWeek)
			protocol.change_1m = getPercentChange(protocol.tvl, protocol.tvlPrevMonth)
			protocol.mcaptvl = p.mcap && protocol.tvl ? +(p.mcap / protocol.tvl).toFixed(2) : null

			Object.entries(p.chainTvls).forEach(([sectionName, sectionTvl]) => {
				if (chain) {
					if (sectionName.startsWith(`${chain}-`)) {
						const sectionToAdd = sectionName.split('-')[1]
						protocol.extraTvl[sectionToAdd] = sectionTvl
					}
				} else {
					const firstChar = sectionName[0]
					if (firstChar === firstChar.toLowerCase()) {
						protocol.extraTvl[sectionName] = sectionTvl
					}
				}
			})

			return keepNeededProperties(protocol, protocolProps)
		})

	return data.sort((a, b) => b.tvl - a.tvl)
}
