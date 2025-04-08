import { PROTOCOLS_API } from '~/constants/index'
import { withPerformanceLogging } from '~/utils/perf'
import { fetchWithErrorLogging } from '~/utils/async'
import { slug } from '~/utils'
import { getChainOverviewData } from '~/ChainOverview/queries.server'
import { maxAgeForNext } from '~/api'
import { ChainOverview } from '~/ChainOverview'

const fetch = fetchWithErrorLogging

export const getStaticProps = withPerformanceLogging('chain/[chain]', async ({ params }) => {
	const chain = params.chain

	if (typeof chain !== 'string') {
		return { notFound: true }
	}

	const data = await getChainOverviewData({ chain })

	if (!data) {
		return { notFound: true }
	}

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
	return <ChainOverview {...props} />
}
