import { maxAgeForNext } from '~/api'
import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

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

const pageName = ['Bridges Volume', 'by', 'Chain']

export default function Bridges({
	chains,
	filteredBridges,
	messagingProtocols,
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
		<Layout title={`Bridge Volume - DefiLlama`} pageName={pageName}>
			<BridgesOverviewByChain
				chains={chains}
				selectedChain={chain}
				filteredBridges={filteredBridges}
				messagingProtocols={messagingProtocols}
				bridgeNames={bridgeNames}
				bridgeNameToChartDataIndex={bridgeNameToChartDataIndex}
				chartDataByBridge={chartDataByBridge}
				chainVolumeData={chainVolumeData}
				bridgeStatsCurrentDay={bridgeStatsCurrentDay}
				largeTxsData={largeTxsData}
			/>
		</Layout>
	)
}
