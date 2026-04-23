import { slug } from '~/utils'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'
import type { TokenDirectoryRecord } from '~/utils/tokenDirectory'

function resolveAvailableUnlockSlug(
	candidate: string | null | undefined,
	emissionsProtocolsList: string[]
): string | null {
	if (!candidate) return null

	const normalizedCandidate = slug(candidate)
	if (!normalizedCandidate) return null

	return emissionsProtocolsList.includes(normalizedCandidate) ? normalizedCandidate : null
}

export function resolveTokenUnlockSlug({
	record,
	protocolMetadata,
	chainMetadata,
	emissionsProtocolsList
}: {
	record: TokenDirectoryRecord
	protocolMetadata: Record<string, IProtocolMetadata>
	chainMetadata: Record<string, IChainMetadata>
	emissionsProtocolsList: string[]
}): string | null {
	if (record.protocolId) {
		const protocolEntry = protocolMetadata[record.protocolId]
		const protocolCandidate = protocolEntry?.displayName ?? protocolEntry?.name ?? null
		const protocolSlug = resolveAvailableUnlockSlug(protocolCandidate, emissionsProtocolsList)
		if (protocolSlug) return protocolSlug
	}

	if (record.chainId) {
		const chainEntry = chainMetadata[String(record.chainId).toLowerCase()]
		return resolveAvailableUnlockSlug(chainEntry?.name ?? record.chainId, emissionsProtocolsList)
	}

	return null
}
