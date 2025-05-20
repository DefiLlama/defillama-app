import { getForkPageData } from '~/containers/Forks/queries'
import { withPerformanceLogging } from '~/utils/perf'
import { ForksByProtocol } from '~/containers/Forks'
import Layout from '~/layout'
import { ProtocolsChainsSearch } from '~/components/Search/ProtocolsChains'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import metadata from '~/utils/metadata'
import { maxAgeForNext } from '~/api'
import { slug } from '~/utils'
const { protocolMetadata } = metadata

export const getStaticProps = withPerformanceLogging('forks', async ({ params: { fork } }) => {
	const normalizedName = slug(fork)
	const metadata = Object.entries(protocolMetadata).find((p) => p[1].name === normalizedName)?.[1]

	if (!metadata || !metadata.forks) {
		return { notFound: true, props: null }
	}

	const data = await getForkPageData(metadata.displayName)

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
			{props.tokenLinks?.length > 0 && (
				<RowLinksWithDropdown links={props.tokenLinks} activeLink={props.token} alternativeOthersText="Others" />
			)}
			<ForksByProtocol {...props} />
		</Layout>
	)
}
