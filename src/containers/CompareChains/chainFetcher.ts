import { getChainOverviewData } from '../ChainOverview/queries.server'
import { getAdapterChainOverview, getAdapterProtocolSummary } from '../DimensionAdapters/queries'

export const fetchChain = async ({ chain }) => {
	const [chainOverviewData, dexVolumeData, chainFeesData, chainRevenueData] = await Promise.all([
		getChainOverviewData({ chain }),
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
