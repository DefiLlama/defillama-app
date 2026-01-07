import { maxAgeForNext } from '~/api'
import { RWAOverview } from '~/containers/RWA'
import { getRWAAssetsOverview, getRWAChainsList } from '~/containers/RWA/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export async function getStaticPaths() {
	const chains = await getRWAChainsList()

	return {
		paths: chains.map((chain) => ({ params: { chain: [chain] } })),
		fallback: 'blocking'
	}
}

export const getStaticProps = withPerformanceLogging(
	`rwa/chain/[...chain]`,
	async ({
		params: {
			chain: [chain]
		}
	}) => {
		const props = await getRWAAssetsOverview(chain)

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
			canonicalUrl={`/rwa`}
		>
			<RWAOverview {...props} />
		</Layout>
	)
}
