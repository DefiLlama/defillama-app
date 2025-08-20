import { maxAgeForNext } from '~/api'
import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'bridges/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
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
			revalidate: maxAgeForNext([22])
		}
	}
)

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

const pageName = ['Bridges Volume', 'by', 'Chain']

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
		<Layout title={`Bridge Volume - DefiLlama`} pageName={pageName}>
			<BridgesOverviewByChain
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
