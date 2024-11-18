import Layout from '~/layout'
import { maxAgeForNext } from '~/api'
import BridgeList from '~/containers/BridgesPage/BridgeList'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'
import { withPerformanceLogging } from '~/utils/perf'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

export const getStaticProps = withPerformanceLogging('bridges', async () => {
	const props = await getBridgeOverviewPageData(null)

	/*
	const backgroundColor = await getPeggedColor({
		peggedAsset: props.filteredPeggedAssets[0]?.name
	})
	*/
	return {
		props: {
			...props
			// backgroundColor
		},
		revalidate: maxAgeForNext([22])
	}
})

export default function Bridges({
	chains,
	filteredBridges,
	bridgeNames,
	bridgeNameToChartDataIndex,
	chartDataByBridge,
	chain,
	chainVolumeData,
	bridgeStatsCurrentDay,
	largeTxsData
	//backgroundColor
}) {
	return (
		<QueryClientProvider client={queryClient}>
			<Layout title={`Bridge Volume - DefiLlama`} defaultSEO>
				<BridgeList
					chains={chains}
					selectedChain={chain}
					filteredBridges={filteredBridges}
					bridgeNames={bridgeNames}
					bridgeNameToChartDataIndex={bridgeNameToChartDataIndex}
					chartDataByBridge={chartDataByBridge}
					chainVolumeData={chainVolumeData}
					bridgeStatsCurrentDay={bridgeStatsCurrentDay}
					largeTxsData={largeTxsData}
				/>
			</Layout>
		</QueryClientProvider>
	)
}
