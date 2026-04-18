import type { ProtocolLite } from '~/containers/Protocols/api.types'
import type { IProtocolMetricsV2 } from './api.types'

export function resolveProtocolCategory({
	protocolData,
	liteProtocols
}: {
	protocolData: Pick<IProtocolMetricsV2, 'category' | 'id' | 'isParentProtocol'>
	liteProtocols: ReadonlyArray<Pick<ProtocolLite, 'parentProtocol' | 'category' | 'tvl'>>
}): string | null {
	if (protocolData.category) {
		return protocolData.category
	}

	if (!protocolData.isParentProtocol) {
		return null
	}

	let topChildCategory: string | null = null
	let topChildTvl = Number.NEGATIVE_INFINITY

	for (const protocol of liteProtocols) {
		if (protocol.parentProtocol !== protocolData.id || !protocol.category) {
			continue
		}

		if (protocol.tvl > topChildTvl) {
			topChildTvl = protocol.tvl
			topChildCategory = protocol.category
		}
	}

	return topChildCategory
}
