import { getForkPageData } from '~/containers/Forks/queries'
import { withPerformanceLogging } from '~/utils/perf'
import { ForksByProtocol } from '~/containers/Forks'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { maxAgeForNext } from '~/api'
import { slug } from '~/utils'
import { Metrics } from '~/components/Metrics'

export const getStaticProps = withPerformanceLogging('forks', async ({ params: { fork } }) => {
	const normalizedName = slug(fork)
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { protocolMetadata } = metadataCache
	let metadata
	for (const key in protocolMetadata) {
		if (protocolMetadata[key].name === normalizedName) {
			metadata = [key, protocolMetadata[key]]
			break
		}
	}

	if (!metadata || !metadata[1].forks) {
		return { notFound: true, props: null }
	}

	const data = await getForkPageData(metadata[1].displayName)

	if (!data) return { notFound: true, props: null }

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export default function Forks(props) {
	return (
		<Layout title={`Forks - DefiLlama`} defaultSEO>
			<ProtocolsChainsSearch />
			<Metrics currentMetric="TVL in forks" />
			{props.tokenLinks?.length > 0 && (
				<RowLinksWithDropdown links={props.tokenLinks} activeLink={props.token} alternativeOthersText="Others" />
			)}
			<ForksByProtocol {...props} />
		</Layout>
	)
}
