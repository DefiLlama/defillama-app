import type { GetStaticPropsContext } from 'next'
import { maxAgeForNext } from '~/api'
import { RWA_STATS_API } from '~/constants'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview, getRWAChainsList } from '~/containers/RWA/queries'
import { rwaSlug } from '~/containers/RWA/rwaSlug'
import Layout from '~/layout'
import { fetchJson } from '~/utils/async'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const chains = await getRWAChainsList()

	return {
		paths: chains.slice(0, 10).map((chain) => ({ params: { chain } })),
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

		const stats = await fetchJson<{ byChain?: Record<string, unknown> }>(RWA_STATS_API)
		if (!stats?.byChain) {
			throw new Error('Failed to get RWA stats')
		}

		let chainExists = false
		for (const chain in stats.byChain) {
			if (rwaSlug(chain) === chainSlug) {
				chainExists = true
				break
			}
		}
		if (!chainExists) {
			return { notFound: true, props: null }
		}

		const props = await getRWAAssetsOverview({ chain: chainSlug })

		if (!props) return { notFound: true }

		return {
			props,
			revalidate: maxAgeForNext([22])
		}
	}
)

const pageName = ['RWA']

export default function RWAPage(props) {
	return (
		<Layout
			title="Real World Assets - DefiLlama"
			description={`Real World Assets on DefiLlama. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`real world assets, defi rwa rankings, rwa on chain`}
			pageName={pageName}
			canonicalUrl={`/rwa/chains`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
