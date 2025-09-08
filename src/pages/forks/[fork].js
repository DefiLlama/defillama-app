import { maxAgeForNext } from '~/api'
import { tvlOptions } from '~/components/Filters/options'
import { RowLinksWithDropdown } from '~/components/RowLinksWithDropdown'
import { ForksByProtocol } from '~/containers/Forks'
import { getForkPageData } from '~/containers/Forks/queries'
import Layout from '~/layout'
import { slug } from '~/utils'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging('forks', async ({ params: { fork } }) => {
	const normalizedName = slug(fork)
	const metadataCache = await import('~/utils/metadata').then((m) => m.default)
	const { protocolMetadata } = metadataCache
	let metadata
	for (const key in protocolMetadata) {
		if (slug(protocolMetadata[key].displayName) === normalizedName) {
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

const pageName = ['Forked Protocols Rankings']

export default function Forks(props) {
	return (
		<Layout
			title={`Forks - DefiLlama`}
			description={`Protocols rankings by their forks value. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`forks by protocol, protocol forks, forks on blockchain`}
			canonicalUrl={`/forks`}
			metricFilters={tvlOptions}
			pageName={pageName}
		>
			{props.tokenLinks?.length > 0 && (
				<RowLinksWithDropdown links={props.tokenLinks} activeLink={props.token} alternativeOthersText="Others" />
			)}
			<ForksByProtocol {...props} />
		</Layout>
	)
}
