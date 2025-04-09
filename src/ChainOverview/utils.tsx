import { removedCategories } from '~/constants'
import type { ILiteProtocol, IProtocolMetadata } from './types'
import { formattedNum } from '~/utils'

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

export const toStrikeTvl = (protocol, toggledSettings) => {
	if (removedCategories.includes(protocol.category)) return true

	if (protocol.category === 'Liquid Staking' && !toggledSettings['liquidstaking'] && !toggledSettings['doublecounted'])
		return true

	return false
}
