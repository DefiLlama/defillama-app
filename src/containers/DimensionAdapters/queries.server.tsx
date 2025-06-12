import metadataCache from '~/utils/metadata'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'
import { getAdapterChainOverview } from './queries'
import { postRuntimeLogs } from '~/utils/async'

// TODO single api
export async function getDimensionAdapterChainsOverview({
	adapterType,
	dataType
}: {
	adapterType: `${ADAPTER_TYPES}`
	dataType?: `${ADAPTER_DATA_TYPES}`
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
				adapterType,
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
