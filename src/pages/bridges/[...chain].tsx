import { maxAgeForNext } from '~/api'
import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

// todo check name in metadata
export const getStaticProps = withPerformanceLogging(
	'bridges/[...chain]',
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		// const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		// const chainMetadata = metadataCache.chainMetadata[slug(chain)]
		// if (!chainMetadata || !chainMetadata.inflows) {
		// 	return { notFound: true }
		// }

		const props = await getBridgeOverviewPageData(chain)

		if (!props.filteredBridges || props.filteredBridges?.length === 0) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		return {
			props,
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
		<Layout
			title={`Bridges Volume on ${chain} - DefiLlama`}
			description={`Track Bridge Volume deployed on ${chain}. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${chain} bridge volume`}
			canonicalUrl={`/bridges/${chain}`}
			pageName={pageName}
		>
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
