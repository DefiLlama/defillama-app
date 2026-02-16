import { PROTOCOL_API } from '~/constants'
import { slug } from '~/utils'
import { fetchJson } from '~/utils/async'
import type { RawProtocolResponse } from './api.types'

/**
 * Fetch protocol details for the selected compare-protocols entry.
 */
export async function fetchProtocol(
	selectedProtocol: string | null
): Promise<{ protocolData: RawProtocolResponse; protocolName: string } | null> {
	if (!selectedProtocol) return null

	const protocolData = await fetchJson<RawProtocolResponse>(`${PROTOCOL_API}/${slug(selectedProtocol)}`)
	return {
		protocolData,
		protocolName: protocolData.name
	}
}
