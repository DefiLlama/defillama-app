import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { TemporarilyDisabledPage } from '~/components/TemporarilyDisabledPage'
import { SKIP_BUILD_STATIC_GENERATION } from '~/constants'
import { BridgedTVLByChain } from '~/containers/BridgedTVL/BridgedTVLByChain'
import { getBridgedTVLByChain } from '~/containers/BridgedTVL/queries'
import Layout from '~/layout'
import { capitalizeFirstLetter, slug } from '~/utils'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(
	'bridged/[chain]',
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		if (!params?.chain) {
			return { notFound: true }
		}

		const { chain } = params
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const currentChainMetadata = metadataCache.chainMetadata[slug(chain)]
		if (!currentChainMetadata || !currentChainMetadata.chainAssets) {
			return { notFound: true }
		}

		const data = await getBridgedTVLByChain({ chain, chainMetadata: metadataCache.chainMetadata })

		return {
			props: { ...data, chain, chainName: capitalizeFirstLetter(chain) },
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

const pageName = ['Bridged TVL', 'by', 'Chain']

export default function Bridged(props: InferGetStaticPropsType<typeof getStaticProps>) {
	if (!props.chainData) {
		return (
			<TemporarilyDisabledPage
				title={`${props.chainName} Bridged Assets & Cross-Chain TVL - Assets Bridged To ${props.chainName} - DefiLlama`}
				description={`Track total value of assets bridged to ${props.chainName} from other chains. View bridged TVL breakdown by token, source chain, and bridge protocol. Real-time cross-chain asset analytics for ${props.chainName}.`}
				canonicalUrl={`/bridged/${props.chain}`}
				heading="Bridged TVL temporarily unavailable"
			>
				<p>We recognize this route, but the upstream bridge APIs failed while loading this page.</p>
				<p>Please try again in a few minutes.</p>
			</TemporarilyDisabledPage>
		)
	}

	return (
		<Layout
			title={`${props.chainName} Bridged Assets & Cross-Chain TVL - Assets Bridged To ${props.chainName} - DefiLlama`}
			description={`Track total value of assets bridged to ${props.chainName} from other chains. View bridged TVL breakdown by token, source chain, and bridge protocol. Real-time cross-chain asset analytics for ${props.chainName}.`}
			canonicalUrl={`/bridged/${props.chain}`}
			pageName={pageName}
		>
			<BridgedTVLByChain {...props} />
		</Layout>
	)
}
