import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
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
			return { notFound: true, props: null }
		}

		const { chain } = params
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const chainMetadata = metadataCache.chainMetadata[slug(chain)]
		if (!chainMetadata || !chainMetadata.chainAssets) {
			return { notFound: true }
		}

		const data = await getBridgedTVLByChain(chain)

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
		return <div>Not found</div>
	}
	return (
		<Layout
			title={`${props.chainName} Bridged TVL - DefiLlama`}
			description={`Track bridged TVL on ${props.chainName} - View total value of all tokens held on ${props.chainName}. Real-time DeFi bridge analytics from DefiLlama.`}
			keywords={`bridged tvl ${props.chainName}, tokens value on ${props.chainName}`}
			canonicalUrl={`/bridged/${props.chain}`}
			pageName={pageName}
		>
			<BridgedTVLByChain {...props} />
		</Layout>
	)
}
