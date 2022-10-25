import Layout from '~/layout'
import { revalidate } from '~/api'
import BridgeList from '~/components/BridgesPage/BridgeList'
import { getBridgeOverviewPageData, getBridges } from '~/api/categories/bridges'

export async function getStaticProps({
	params: {
		chain: [chain]
	}
}) {
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
		},
		revalidate: revalidate()
	}
}

// export async function getStaticPaths() {
// 	const { chains } = await getBridges()

// 	const paths = chains.slice(0, 20).map((chain) => ({
// 		params: { chain: [chain.name] }
// 	}))

// 	return { paths, fallback: 'blocking' }
// }

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
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
