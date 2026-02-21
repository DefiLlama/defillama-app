import { fetchProtocolBySlug } from '~/containers/ProtocolOverview/api'
import { slug } from '~/utils'
import type { RawProtocolResponse } from './api.types'

/**
 * Fetch protocol details for the selected compare-protocols entry.
 */
export async function fetchProtocol(
	selectedProtocol: string | null
): Promise<{ protocolData: RawProtocolResponse; protocolName: string } | null> {
	if (!selectedProtocol) return null

	const protocolData = await fetchProtocolBySlug<RawProtocolResponse>(slug(selectedProtocol))
	return {
		protocolData,
		protocolName: protocolData.name
	}
}
