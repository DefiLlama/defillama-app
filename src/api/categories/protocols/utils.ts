import { getPercentChange } from '~/utils'
import { keepNeededProperties } from '../../shared'

export const basicPropertiesToKeep = [
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
	'category'
]

export const formatProtocolsData = ({
	chain = '',
	oracle = null,
	fork = null,
	category = '',
	protocols = [],
	protocolProps = [...basicPropertiesToKeep, 'extraTvl'],
	removeBridges = false
}) => {
	let filteredProtocols = [...protocols]

	if (removeBridges) {
		filteredProtocols = filteredProtocols.filter(({ category }) => category !== 'Bridge')
	}

	if (chain) {
		filteredProtocols = filteredProtocols.filter(({ chains = [] }) => chains.includes(chain))
	}

	if (oracle) {
		filteredProtocols = filteredProtocols.filter(({ oracles = [] }) => oracles.includes(oracle))
	}

	if (fork) {
		filteredProtocols = filteredProtocols.filter(({ forkedFrom = [] }) => forkedFrom.includes(fork))
	}

	if (category) {
		filteredProtocols = filteredProtocols.filter(
			({ category: protocolCategory = '' }) =>
				category.toLowerCase() === (protocolCategory ? protocolCategory.toLowerCase() : '')
		)
	}

	filteredProtocols = filteredProtocols.map((protocol) => {
		if (chain) {
			protocol.tvl = protocol.chainTvls[chain]?.tvl ?? 0
			protocol.tvlPrevDay = protocol.chainTvls[chain]?.tvlPrevDay ?? null
			protocol.tvlPrevWeek = protocol.chainTvls[chain]?.tvlPrevWeek ?? null
			protocol.tvlPrevMonth = protocol.chainTvls[chain]?.tvlPrevMonth ?? null
		}
		protocol.extraTvl = {}
		protocol.change_1d = getPercentChange(protocol.tvl, protocol.tvlPrevDay)
		protocol.change_7d = getPercentChange(protocol.tvl, protocol.tvlPrevWeek)
		protocol.change_1m = getPercentChange(protocol.tvl, protocol.tvlPrevMonth)
		protocol.mcaptvl = protocol.mcap && protocol.tvl ? protocol.mcap / protocol.tvl : null

		Object.entries(protocol.chainTvls).forEach(([sectionName, sectionTvl]) => {
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

	if (chain) {
		filteredProtocols = filteredProtocols.sort((a, b) => b.tvl - a.tvl)
	}

	return filteredProtocols
}
