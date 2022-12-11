import Layout from '~/layout'
import { addMaxAgeHeaderForNext } from '~/api'
import BridgeList from '~/components/BridgesPage/BridgeList'
import { getBridgeOverviewPageData } from '~/api/categories/bridges'

export const getServerSideProps = async ({
	params: {
		chain: [chain]
	},
	res
}) => {
	addMaxAgeHeaderForNext(res, [22], 3600)
	const props = await getBridgeOverviewPageData(chain)

	if (!props.filteredBridges || props.filteredBridges?.length === 0) {
		return {
			notFound: true
		}
	}
	/*
	const backgroundColor = await getPeggedColor({
		peggedAsset: props.filteredPeggedAssets[0]?.name
	})
	*/
	return {
		props: {
			...props
		}
	}
}

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
	)
}
