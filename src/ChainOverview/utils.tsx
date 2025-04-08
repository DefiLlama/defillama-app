import { removedCategories } from '~/constants'
import type { ILiteProtocol, IProtocolMetadata } from './types'

export const toFilterProtocol = ({
	protocolMetadata,
	protocolData,
	chainDisplayName
}: {
	protocolMetadata: IProtocolMetadata
	protocolData: ILiteProtocol
	chainDisplayName: string | null
}): boolean => {
	return protocolMetadata.name &&
		!protocolMetadata.name.startsWith('chain#') &&
		protocolMetadata.displayName &&
		protocolMetadata.chains &&
		(chainDisplayName !== 'All' ? protocolMetadata.chains.includes(chainDisplayName) : true) &&
		protocolData.category !== 'Bridge'
		? true
		: false
}

export const sumTvl = (childTvl, parentTvl) => {
	const final = { ...parentTvl }
	for (const tvlKey in childTvl) {
		final[tvlKey] = {
			tvl: (parentTvl?.[tvlKey]?.tvl ?? 0) + (childTvl?.[tvlKey]?.tvl ?? 0),
			tvlPrevDay: (parentTvl?.[tvlKey]?.tvlPrevDay ?? 0) + (childTvl?.[tvlKey]?.tvlPrevDay ?? 0),
			tvlPrevWeek: (parentTvl?.[tvlKey]?.tvlPrevWeek ?? 0) + (childTvl?.[tvlKey]?.tvlPrevWeek ?? 0),
			tvlPrevMonth: (parentTvl?.[tvlKey]?.tvlPrevMonth ?? 0) + (childTvl?.[tvlKey]?.tvlPrevMonth ?? 0)
		}
	}
	return final
}

export const toStrikeTvl = (protocol, toggledSettings) => {
	if (removedCategories.includes(protocol.category)) return true

	if (protocol.category === 'Liquid Staking' && !toggledSettings['liquidstaking'] && !toggledSettings['doublecounted'])
		return true

	return false
}
