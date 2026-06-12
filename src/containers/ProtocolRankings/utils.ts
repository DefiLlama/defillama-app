import { removedCategoriesFromChainTvlSet } from '~/constants'
import { slug } from '~/utils'
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

export const toStrikeTvl = (
	protocol: Pick<ILiteProtocol, 'category'>,
	extraTvlSections: { liquidstaking?: boolean; doublecounted?: boolean } | Record<string, boolean>
) => {
	if (removedCategoriesFromChainTvlSet.has(protocol.category)) return true

	if (extraTvlSections['liquidstaking'] || extraTvlSections['doublecounted']) return true

	return false
}

export const protocolMatchesForkFilter = ({
	protocol,
	normalizedFork
}: {
	protocol: Pick<ILiteProtocol, 'forkedFrom'>
	normalizedFork: string | null
}): boolean => {
	if (!normalizedFork) return true

	const forkedFrom = protocol.forkedFrom
	if (!forkedFrom) return false
	for (const forkName of forkedFrom) {
		if (slug(forkName) === normalizedFork) return true
	}
	return false
}

export const protocolMatchesOracleFilter = ({
	protocol,
	normalizedOracle,
	isAllChains,
	chainDisplayName
}: {
	protocol: Pick<ILiteProtocol, 'oracles' | 'oraclesByChain'>
	normalizedOracle: string | null
	isAllChains: boolean
	chainDisplayName: string
}): boolean => {
	if (!normalizedOracle) return true

	const oraclesByChain = protocol.oraclesByChain ?? {}
	let hasOraclesByChain = false
	for (const _chain in oraclesByChain) {
		hasOraclesByChain = true
		break
	}

	if (hasOraclesByChain) {
		if (!isAllChains) {
			const normalizedChainName = slug(chainDisplayName)
			for (const chainName in oraclesByChain) {
				if (slug(chainName) !== normalizedChainName) continue
				const oracleNames = oraclesByChain[chainName]
				for (const oracleName of oracleNames) {
					if (slug(oracleName) === normalizedOracle) return true
				}
				return false
			}
			return false
		}

		for (const chainName in oraclesByChain) {
			const oracleNames = oraclesByChain[chainName]
			for (const oracleName of oracleNames) {
				if (slug(oracleName) === normalizedOracle) return true
			}
		}
		return false
	}

	return (protocol.oracles ?? []).some((oracleName) => slug(oracleName) === normalizedOracle)
}
