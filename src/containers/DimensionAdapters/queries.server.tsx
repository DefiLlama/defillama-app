import metadataCache from '~/utils/metadata'
import { ADAPTOR_TYPES } from './constants'
import { getAdapterChainOverview } from './queries'
import { postRuntimeLogs } from '~/utils/async'

// TODO single api
export async function getDimensionAdapterChainsOverview({
	adapterType,
	dataType
}: {
	adapterType: `${ADAPTOR_TYPES}`
	dataType?: string
}) {
	const chains = []
	for (const chain in metadataCache.chainMetadata) {
		if (metadataCache.chainMetadata[chain][adapterType]) {
			chains.push(chain)
		}
	}

	const data = await Promise.all(
		chains.map((chain) =>
			getAdapterChainOverview({
				chain,
				type: adapterType,
				excludeTotalDataChart: true,
				excludeTotalDataChartBreakdown: true,
				dataType
			}).catch(() => {
				postRuntimeLogs(`getDimensionAdapterChainsOverview:${chain}:${adapterType}:failed`)
				return null
			})
		)
	)

	return data.filter(Boolean)
}
