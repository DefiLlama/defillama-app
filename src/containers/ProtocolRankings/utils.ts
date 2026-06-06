import { removedCategoriesFromChainTvlSet } from '~/constants'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { ILiteProtocol } from './types'

const excludedCategoriesSet = new Set(['Canonical Bridge', 'Staking Pool', 'Foundation'])

export const toFilterProtocol = ({
	protocolMetadata,
	protocolData,
	chainDisplayName
}: {
	protocolMetadata: IProtocolMetadata
	protocolData: ILiteProtocol
	chainDisplayName: string | null
}): boolean => {
	const combinedChainsSet = new Set([...(protocolMetadata.chains ?? []), ...(protocolData.chains ?? [])])

	return !!(
		protocolMetadata.displayName &&
		protocolMetadata.chains &&
		(chainDisplayName !== 'All' ? combinedChainsSet.has(chainDisplayName) : true) &&
		!excludedCategoriesSet.has(protocolData.category)
	)
}

export const toStrikeTvl = (protocol, toggledSettings) => {
	if (removedCategoriesFromChainTvlSet.has(protocol.category)) return true

	if (toggledSettings['liquidstaking'] || toggledSettings['doublecounted']) return true

	return false
}
