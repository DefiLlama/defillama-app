import { maxAgeForNext } from '~/api'
import { Pool2ProtocolsTVLByChain } from '~/containers/Pool2/Pool2ByChain'
import { getPool2TVLByChain } from '~/containers/Pool2/queries'
import Layout from '~/layout'
import { withPerformanceLogging } from '~/utils/perf'

export const getStaticProps = withPerformanceLogging(`pool2/index`, async () => {
	const data = await getPool2TVLByChain({ chain: 'All' })

	if (!data) return { notFound: true }

	return {
		props: data,
		revalidate: maxAgeForNext([22])
	}
})

const pageName = ['Protocols', 'ranked by', 'Pool2 TVL']

export default function Pool2TVL(props) {
	return (
		<Layout
			title="Pool2 TVL - DefiLlama"
			description={`Pool2 TVL by Protocol. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`pool2 tvl by protocol`}
			canonicalUrl={`/pool2`}
			pageName={pageName}
		>
			<Pool2ProtocolsTVLByChain {...props} />
		</Layout>
	)
}
