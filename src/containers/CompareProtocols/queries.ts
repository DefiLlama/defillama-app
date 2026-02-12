import { maxAgeForNext } from '~/api'
import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { tokenIconUrl } from '~/utils'
import type { CompareProtocolsProps } from './types'

export async function getCompareProtocolsPageData(): Promise<{
	props: CompareProtocolsProps
	revalidate: number
}> {
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)

	const { protocols } = await getChainOverviewData({
		chain: 'All',
		chainMetadata: metadataCache.chainMetadata,
		protocolMetadata: metadataCache.protocolMetadata
	})

	return {
		props: {
			protocols,
			protocolsList: protocols
				.reduce<Array<{ value: string; label: string; logo: string; score: number }>>(
					(acc, protocol) => {
						acc.push({
							value: protocol.name,
							label: protocol.name,
							logo: tokenIconUrl(protocol.name),
							score: protocol.tvl?.default?.tvl ?? 0
						})
						if (protocol.childProtocols) {
							for (const childProtocol of protocol.childProtocols) {
								acc.push({
									value: childProtocol.name,
									label: childProtocol.name,
									logo: tokenIconUrl(childProtocol.name),
									score: 1
								})
							}
						}
						return acc
					},
					[]
				)
				.sort((a, b) => b.score - a.score)
		},
		revalidate: maxAgeForNext([22])
	}
}
