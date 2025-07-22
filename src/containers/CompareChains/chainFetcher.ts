import { getAdapterChainOverview, getAdapterProtocolSummary } from '../DimensionAdapters/queries'
import { getChainOverviewData } from '../ChainOverview/queries.server'

export const fetchChain = async ({ chain }) => {
	const [chainOverviewData, dexVolumeData, chainFeesData, chainRevenueData] = await Promise.all([
		getChainOverviewData({ chain }),
		getAdapterChainOverview({
			adapterType: 'dexs',
			chain,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		}),
		getAdapterProtocolSummary({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true
		}).catch(() => null),
		getAdapterProtocolSummary({
			adapterType: 'fees',
			protocol: chain,
			excludeTotalDataChart: false,
			excludeTotalDataChartBreakdown: true,
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
