import type { GetStaticPropsContext } from 'next'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

// todo check name in metadata
export const getStaticProps = withPerformanceLogging(
	'bridges/[chain]',
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		if (!params?.chain) {
			return { notFound: true, props: null }
		}

		const { chain } = params
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
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	return { paths: [], fallback: 'blocking' }
}

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
		<Layout
			title={`Bridges Volume on ${chain} - DefiLlama`}
			description={`Live bridge volume analytics for ${chain}. Track deposits, withdrawals, large transactions and net flows across bridges and protocols.`}
			keywords={`${chain} bridge volume`}
			canonicalUrl={`/bridges/${chain}`}
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
				bridgeStatsCurrentDay={bridgeStatsCurrentDay}
				largeTxsData={largeTxsData}
			/>
		</Layout>
	)
}
