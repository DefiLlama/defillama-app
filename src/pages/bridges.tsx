import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
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
	rawBridgeVolumeData,
	netflowsData,
	bridgeStatsCurrentDay,
	largeTxsData
	//backgroundColor
}) {
	return (
		<Layout
			title={`Cross-Chain Bridge Volume & Rankings - DefiLlama`}
			description={`Track bridge volume and cross-chain transfers on DefiLlama. Bridge volume includes sum of all assets that were bridged through the protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`bridge volume, cross-chain transfers, bridge data, bridge volume by chain`}
			canonicalUrl={`/bridges`}
			pageName={pageName}
		>
			<BridgesOverviewByChain
				chains={chains}
				selectedChain={chain}
				filteredBridges={filteredBridges}
				messagingProtocols={messagingProtocols}
				bridgeNames={bridgeNames}
				bridgeNameToChartDataIndex={bridgeNameToChartDataIndex}
				chartDataByBridge={chartDataByBridge}
				chainVolumeData={chainVolumeData}
				rawBridgeVolumeData={rawBridgeVolumeData}
				netflowsData={netflowsData}
				bridgeStatsCurrentDay={bridgeStatsCurrentDay}
				largeTxsData={largeTxsData}
			/>
		</Layout>
	)
}
