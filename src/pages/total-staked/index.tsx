import { maxAgeForNext } from '~/api'
import { getTotalStakedByChain } from '~/containers/TotalStaked/queries'
import { StakedProtocolsTVLByChain } from '~/containers/TotalStaked/StakedByChain'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`total-staked/index`, async () => {
	const data = await getTotalStakedByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Total Value Staked']

export default function TotalBorrowed(props) {
	return (
		<Layout
			title="Total Staked - DefiLlama"
			description={`Total Staked by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`total value staked by protocol`}
			canonicalUrl={`/total-staked`}
			pageName={pageName}
		>
			<StakedProtocolsTVLByChain {...props} />
		</Layout>
	)
}
