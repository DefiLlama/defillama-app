import type { GetStaticPropsContext, InferGetStaticPropsType } from 'next'
import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	// When this is true (in preview environments) don't
	// prerender any static pages
	// (faster builds, but slower initial page load)
	if (process.env.SKIP_BUILD_STATIC_GENERATION) {
		return {
			paths: [],
			fallback: 'blocking'
		}
	}

	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const rwaList = metadataCache.rwaList
	return {
		paths: rwaList.chains.slice(0, 10).map((chain) => ({ params: { chain: rwaSlug(chain) } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/chain/[chain]`,
	async ({ params }: GetStaticPropsContext<{ chain: string }>) => {
		if (!params?.chain) {
			return { notFound: true, props: null }
		}

		const chainSlug = rwaSlug(params.chain)

		let chainName = null
		const metadataCache = await import('~/utils/metadata').then((m) => m.default)
		const rwaList = metadataCache.rwaList
		for (const chain of rwaList.chains) {
			if (rwaSlug(chain) === chainSlug) {
				chainName = chain
				break
			}
		}
		if (!chainName) {
			return { notFound: true, props: null }
		}

		const props = await getRWAAssetsOverview({ chain: chainSlug, rwaList })

		if (!props) {
			return { notFound: true, props: null }
		}

		return {
			props: { ...props, chainName },
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props: InferGetStaticPropsType<typeof getStaticProps>) {
	return (
		<Layout
			title={`${props.chainName} - RWA - DefiLlama`}
			description={`${props.chainName} RWA on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`${props.chainName}, real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/chains`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
