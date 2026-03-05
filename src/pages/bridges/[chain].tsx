import type { GetStaticPropsContext } from 'next'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BridgesOverviewByChain } from '~/containers/Bridges/BridgesOverviewByChain'
import { getBridgeOverviewPageData } from '~/containers/Bridges/queries.server'
import Layout from '~/layout'
import { slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import metadataCache, { refreshMetadataIfStale } from '~/utils/metadata'
import { withPerformanceLogging } from '~/utils/perf'

type BridgesPageData = Awaited<ReturnType<typeof getBridgeOverviewPageData>>

type BridgesPageProps =
	| {
			state: 'ready'
			data: BridgesPageData
			chainSlug: string
	  }
	| {
			state: 'disabled'
			chainSlug: string
			chainLabel: string
	  }

export const getStaticProps = withPerformanceLogging(
	'bridges/[chain]',
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		if (!params?.chain) {
			return { notFound: true, props: null }
		}

		await refreshMetadataIfStale()

		const chainSlug = slug(params.chain)
		const supportedChainSlugs = metadataCache.bridgeChainSlugs ?? []
		const isChainCacheAvailable = supportedChainSlugs.length > 0
		const isKnownChainRoute = supportedChainSlugs.includes(chainSlug)

		if (isChainCacheAvailable && !isKnownChainRoute) {
			return {
				notFound: true,
				revalidate: maxAgeForNext([22])
			}
		}

		const canonicalChain = metadataCache.bridgeChainSlugToName?.[chainSlug] ?? params.chain

		try {
			const data = await getBridgeOverviewPageData(canonicalChain)

			if (!data) {
				if (!isKnownChainRoute) {
					return {
						notFound: true,
						revalidate: maxAgeForNext([22])
					}
				}

				return {
					props: {
						state: 'disabled',
						chainSlug,
						chainLabel: canonicalChain
					} satisfies BridgesPageProps,
					revalidate: maxAgeForNext([22])
				}
			}

			if (!isChainCacheAvailable) {
				const hasBridgeResults = (data.filteredBridges?.length ?? 0) + (data.messagingProtocols?.length ?? 0) > 0
				if (!hasBridgeResults) {
					return {
						notFound: true,
						revalidate: maxAgeForNext([22])
					}
				}
			}

			return {
				props: {
					state: 'ready',
					data,
					chainSlug
				} satisfies BridgesPageProps,
				revalidate: maxAgeForNext([22])
			}
		} catch (error) {
			console.error(`[bridges] failed to fetch data for ${canonicalChain}:`, error)

			if (!isKnownChainRoute) {
				return {
					notFound: true,
					revalidate: maxAgeForNext([22])
				}
			}

			return {
				props: {
					state: 'disabled',
					chainSlug,
					chainLabel: canonicalChain
				} satisfies BridgesPageProps,
				revalidate: maxAgeForNext([22])
			}
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

export default function Bridges(props: BridgesPageProps) {
	if (props.state === 'disabled') {
		return (
			<TemporarilyDisabledPage
				title={`Bridges Volume on ${props.chainLabel} - DefiLlama`}
				description="This bridge chain route is temporarily unavailable and will be back shortly."
				canonicalUrl={`/bridges/${props.chainSlug}`}
				heading="Bridge chain data temporarily unavailable"
			>
				<p>We recognize this chain route, but the upstream bridge APIs failed while loading this page.</p>
				<p>Please try again in a few minutes.</p>
			</TemporarilyDisabledPage>
		)
	}

	const {
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
	} = props.data

	return (
		<Layout
			title={`Bridges Volume on ${chain} - DefiLlama`}
			description={`Live bridge volume analytics for ${chain}. Track deposits, withdrawals, large transactions and net flows across bridges and protocols.`}
			canonicalUrl={`/bridges/${props.chainSlug}`}
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
