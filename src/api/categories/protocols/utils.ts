import type { IFormattedProtocol, IProtocol } from '~/api/types'
import { getPercentChange } from '~/utils'
import { keepNeededProperties } from '../../shared'

export type BasicPropsToKeep = (keyof IFormattedProtocol)[]

interface IFormatProtocolsData {
	chain?: string
	oracle?: string
	fork?: string
	category?: string
	protocols: IProtocol[]
	protocolProps?: BasicPropsToKeep
	removeBridges?: boolean
}

export const basicPropertiesToKeep: BasicPropsToKeep = [
	'tvl',
	'name',
	'symbol',
	'chains',
	'change_1d',
	'change_7d',
	'change_1m',
	'tvlPrevDay',
	'tvlPrevWeek',
	'tvlPrevMonth',
	'mcap',
	'mcaptvl',
	'category',
	'parentProtocol'
]

export const formatProtocolsData = ({
	chain = '',
	oracle,
	fork,
	category = '',
	protocols = [],
	protocolProps = [...basicPropertiesToKeep, 'extraTvl'],
	removeBridges = false
}: IFormatProtocolsData) => {
	const data: IFormattedProtocol[] = protocols
		.filter((protocol) => {
			let toFilter = true

			if (removeBridges) {
				toFilter = toFilter && protocol?.category !== 'Bridged'
			}

			if (chain) {
				toFilter = toFilter && protocol.chains?.includes(chain)
			}

			if (oracle) {
				toFilter = toFilter && protocol.oracles?.includes(oracle)
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
			protocol.change_1d = getPercentChange(p.tvl, protocol.tvlPrevDay)
			protocol.change_7d = getPercentChange(p.tvl, protocol.tvlPrevWeek)
			protocol.change_1m = getPercentChange(p.tvl, protocol.tvlPrevMonth)
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
