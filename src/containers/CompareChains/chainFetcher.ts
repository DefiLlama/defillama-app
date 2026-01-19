import { getChainOverviewData } from '../ChainOverview/queries.server'
import { IChainMetadata } from '../ChainOverview/types'
import { getAdapterChainOverview, getAdapterProtocolSummary } from '../DimensionAdapters/queries'
import { IProtocolMetadata } from '../ProtocolOverview/types'

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
		getAdapterProtocolSummary({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false
		}).catch(() => null),
		getAdapterProtocolSummary({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false,
			dataType: 'dailyRevenue'
		}).catch(() => null),
		[]
	])

	return {
		chainOverviewData: chainOverviewData || null,
		dexVolumeChart: dexVolumeData?.totalDataChart ?? null,
		chainFeesChart: chainFeesData?.totalDataChart ?? null,
		chainRevenueChart: chainRevenueData?.totalDataChart ?? null
	}
}
