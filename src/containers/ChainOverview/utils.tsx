import { removedCategoriesFromChainTvlSet } from '~/constants'
import type { RawChainAsset } from '~/containers/BridgedTVL/api.types'
import type { IProtocolMetadata } from '~/utils/metadata/types'
import type { IFormattedChainAsset, ILiteProtocol } from './types'

const excludedCategoriesSet = new Set(['Canonical Bridge', 'Staking Pool'])

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

export function formatChainAssets(chainAsset: RawChainAsset | null) {
	if (!chainAsset) return null

	const acc = {} as IFormattedChainAsset
	for (const type in chainAsset) {
		const asset = chainAsset[type]
		const formatted = {} as any
		formatted.total = Number(asset.total.split('.')[0])
		const breakdown = {}
		for (const b in asset.breakdown) {
			breakdown[b] = Number(asset.breakdown[b].split('.')[0])
		}
		formatted.breakdown = breakdown
		acc[type] = formatted
	}
	return acc
}
