import { maxAgeForNext } from '~/api'
import { Pool2ByChain } from '~/containers/Pool2/Pool2ByChain'
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

export default function Pool2TVL(props) {
	return (
		<Layout title="Pool2 TVL - DefiLlama">
			<Pool2ByChain {...props} />
		</Layout>
	)
}
