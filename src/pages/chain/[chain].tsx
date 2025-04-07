import { PROTOCOLS_API } from '~/constants/index'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchWithErrorLogging } from '~/utils/async'
import { slug } from '~/utils'
import { getChainOverviewData } from '~/ChainOverview/queries'
import { maxAgeForNext } from '~/api'
import { ChainOverview } from '~/ChainOverview'
import metadataCache from '~/utils/metadata'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	if (typeof chain !== 'string' || !metadataCache.chainMetadata[slug(chain)]) {
		return { notFound: true }
	}

	const data = await getChainOverviewData({ chain, metadata: metadataCache.chainMetadata[slug(chain)] })

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	const res = await fetch(PROTOCOLS_API).then((res) => res.json())

	const paths = res.chains.map((chain) => ({
		params: { chain: slug(chain) }
	}))

	return { paths, fallback: 'blocking' }
}

export default function Chain(props) {
	return (
		<Layout title={`${props.metadata.name} - DefiLlama`}>
			<ChainOverview {...props} />
		</Layout>
	)
}
