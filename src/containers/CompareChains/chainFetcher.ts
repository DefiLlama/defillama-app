import { getChainOverviewData } from '~/containers/ChainOverview/queries.server'
import { getAdapterChainOverview, getAdapterProtocolOverview } from '~/containers/DimensionAdapters/queries'
import type { IChainMetadata, IProtocolMetadata } from '~/utils/metadata/types'

export const fetchChain = async ({
	chain,
	chainMetadata,
	protocolMetadata
}: {
	chain: string
	chainMetadata: Record<string, IChainMetadata>
	protocolMetadata: Record<string, IProtocolMetadata>
}) => {
	const [chainOverviewData, dexVolumeData, chainFeesData, chainRevenueData] = await Promise.all([
		getChainOverviewData({
			chain,
			chainMetadata,
			protocolMetadata
		}),
		getAdapterChainOverview({
			adapterType: 'dexs',
			chain,
			excludeTotalDataChart: false
		}),
		getAdapterProtocolOverview({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false
		}).catch(() => null),
		getAdapterProtocolOverview({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false,
			dataType: 'dailyRevenue'
		}).catch(() => null)
	])

	return {
		chainOverviewData: chainOverviewData || null,
		dexVolumeChart: dexVolumeData?.totalDataChart ?? null,
		chainFeesChart: chainFeesData?.totalDataChart ?? null,
		chainRevenueChart: chainRevenueData?.totalDataChart ?? null
	}
}
