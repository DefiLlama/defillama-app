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
	'parentProtocol'
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
					protocol.tvl = 0;
					Object.entries((protocol as any).oraclesByChain).forEach(([chain, oracles]: [any, any]) => {
						if (oracles.includes(oracle)) {
							protocol.tvl += protocol.chainTvls[chain].tvl
						}
					})
					toFilter = toFilter && protocol.tvl !== 0;
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
			protocol.mcaptvl = p.mcap && protocol.tvl ? p.mcap / protocol.tvl : null

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
